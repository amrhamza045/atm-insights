import { base44 } from "@/api/base44Client";
import { ACTIVE_RES_STATUSES, dispatchReservation, returnReservation } from "./equipmentLogic";

export const TRIP_STAGES = ["planned", "loading", "dispatched", "arrived", "returning", "returned"];
export const ACTIVE_TRIP_STAGES = ["planned", "loading", "dispatched", "arrived", "returning"];

export const STAGE_LABELS = {
  planned: "Planned",
  loading: "Loading",
  dispatched: "Dispatched",
  arrived: "Arrived",
  returning: "Returning",
  returned: "Returned",
  cancelled: "Cancelled",
};

// Same conflict principle as Phase 7 equipment: hard block for maintenance/retired,
// override-required conflict for a same-date active trip.
export function vehicleCheck(vehicle, trips, date, excludeTripId) {
  if (vehicle.status === "maintenance") return { blocked: true, reason: "Vehicle is under maintenance" };
  if (vehicle.status === "retired") return { blocked: true, reason: "Vehicle is retired" };
  const clash = (trips || []).find(
    (t) =>
      t.vehicle_id === vehicle.id &&
      t.id !== excludeTripId &&
      ACTIVE_TRIP_STAGES.includes(t.stage) &&
      (!date || t.event_date === date)
  );
  if (clash) return { conflict: true, reason: `Booked for "${clash.event_name}" on ${clash.event_date}` };
  return {};
}

export function transportCost({ cost_basis, distance_km, cost_per_km, days_used, cost_per_day, extra_cost }) {
  const base =
    cost_basis === "per_day"
      ? (Number(days_used) || 0) * (Number(cost_per_day) || 0)
      : (Number(distance_km) || 0) * (Number(cost_per_km) || 0);
  return base + (Number(extra_cost) || 0);
}

// Basic map link from the event's stored venue — full routing/GPS is a future telematics integration
export function mapsLink(trip) {
  if (trip.destination_lat && trip.destination_lng) {
    return `https://www.google.com/maps?q=${trip.destination_lat},${trip.destination_lng}`;
  }
  if (trip.destination_address || trip.destination_label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination_address || trip.destination_label)}`;
  }
  return null;
}

export function destinationFromEvent(event) {
  const offSite = event.location_type === "off_site";
  return {
    destination_label: offSite ? event.venue_name || "Off-site venue" : event.branch_name || "On-site (branch)",
    destination_address: offSite ? event.venue_address || "" : "",
    destination_lat: offSite ? event.venue_lat || 0 : 0,
    destination_lng: offSite ? event.venue_lng || 0 : 0,
  };
}

// Everything the event needs moved: Phase 7 equipment holds + Phase 4 production batches and stock pulls.
// Items already on another live trip of the same event are excluded.
export async function buildChecklist(event, existingTrips, excludeTripId) {
  const [equipRes, orders, stockRes] = await Promise.all([
    base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }),
    base44.entities.ProductionOrder.filter({ catering_event_id: event.id }),
    base44.entities.CateringReservation.filter({ event_id: event.id, status: "reserved" }),
  ]);
  const claimed = new Set(
    (existingTrips || [])
      .filter((t) => t.id !== excludeTripId && ACTIVE_TRIP_STAGES.includes(t.stage))
      .flatMap((t) => (t.checklist || []).map((i) => i.item_key))
  );
  const items = [];
  equipRes
    .filter((r) => ACTIVE_RES_STATUSES.includes(r.status))
    .forEach((r) => {
      items.push({
        item_key: `equipment:${r.id}`,
        source: "equipment",
        ref_id: r.id,
        label: `${r.equipment_name}${r.unit_code ? ` (${r.unit_code})` : ""}`,
        quantity: Number(r.quantity) || 1,
        unit: r.unit_label || (r.unit_code ? "unit" : "pcs"),
        return_expected: true,
        loaded: false,
        returned_status: "pending",
      });
    });
  orders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) => {
      items.push({
        item_key: `production:${o.id}`,
        source: "production",
        ref_id: o.id,
        label: o.output_item_name || o.recipe_name || "Production batch",
        quantity: Number(o.required_output_quantity) || Number(o.target_quantity) || 1,
        unit: o.output_unit || "",
        return_expected: false,
        loaded: false,
        returned_status: "not_applicable",
      });
    });
  stockRes
    .filter((r) => r.purpose === "stock_pull")
    .forEach((r) => {
      items.push({
        item_key: `stock:${r.id}`,
        source: "stock",
        ref_id: r.id,
        label: r.inventory_item_name || "Stock item",
        quantity: Number(r.quantity_reserved) || 1,
        unit: r.unit || "",
        return_expected: false,
        loaded: false,
        returned_status: "not_applicable",
      });
    });
  return items.filter((i) => !claimed.has(i.item_key));
}

// Send the trip out — loaded Phase 7 equipment reservations move to "dispatched" with it
export async function dispatchTrip(trip, userEmail) {
  await base44.entities.CateringTrip.update(trip.id, {
    stage: "dispatched",
    dispatched_at: new Date().toISOString(),
  });
  const equipRows = (trip.checklist || []).filter((i) => i.source === "equipment" && i.loaded);
  for (const row of equipRows) {
    const r = await base44.entities.CateringEquipmentReservation.get(row.ref_id).catch(() => null);
    if (r && r.status === "reserved") await dispatchReservation(r, userEmail);
  }
}

// Return check-in: damaged/missing rows flow straight into the Phase 7 equipment
// return records (which open damage reports and log shortfalls against the event).
export async function completeTripReturn({ trip, results, damageCosts = {}, notes, userEmail }) {
  let discrepancies = 0;
  const checklist = (trip.checklist || []).map((i) => {
    if (!i.return_expected) return i;
    const status = results[i.item_key] || "ok";
    if (status !== "ok") discrepancies++;
    return { ...i, returned_status: status };
  });
  for (const i of checklist.filter((x) => x.source === "equipment" && x.return_expected)) {
    const r = await base44.entities.CateringEquipmentReservation.get(i.ref_id).catch(() => null);
    if (!r || !ACTIVE_RES_STATUSES.includes(r.status)) continue;
    const equipment = await base44.entities.CateringEquipment.get(r.equipment_id).catch(() => null);
    const qty = Number(r.quantity) || 1;
    await returnReservation({
      reservation: r,
      equipment,
      returnedQty: i.returned_status === "ok" ? qty : 0,
      damagedQty: i.returned_status === "damaged" ? qty : 0,
      missingQty: i.returned_status === "missing" ? qty : 0,
      damageCost: i.returned_status === 'damaged' ? Number(damageCosts[i.item_key]) : 0,
      notes,
      userEmail,
    });
  }
  await base44.entities.CateringTrip.update(trip.id, {
    stage: "returned",
    returned_at: new Date().toISOString(),
    checklist,
    discrepancy_count: discrepancies,
    return_notes: notes || "",
  });
  return { discrepancies };
}

// Cancel every live trip an event holds (event cancellation)
export async function cancelTripsForEvent({ eventId, reason }) {
  const trips = await base44.entities.CateringTrip.filter({ event_id: eventId });
  const active = trips.filter((t) => ACTIVE_TRIP_STAGES.includes(t.stage));
  for (const t of active) {
    await base44.entities.CateringTrip.update(t.id, { stage: "cancelled", cancel_reason: reason || "" });
  }
  return { cancelled: active.length };
}