import { base44 } from "@/api/base44Client";

// Reservation statuses that hold equipment (block other events on the same date)
export const ACTIVE_RES_STATUSES = ["reserved", "dispatched"];
// Unit statuses that can never be reserved, regardless of date
export const BLOCKED_UNIT_STATUSES = ["maintenance", "damaged", "retired"];

// Quantity of a bulk item currently out of service (open maintenance/damage records)
export function openMaintenanceQty(equipmentId, maintenance) {
  return (maintenance || [])
    .filter((m) => m.equipment_id === equipmentId && m.status !== "resolved")
    .reduce((s, m) => s + (Number(m.quantity_affected) || 1), 0);
}

// Availability of a bulk item for a given date (date = null → count every live hold)
export function bulkAvailability(equipment, reservations, maintenance, date) {
  const total = Number(equipment.total_quantity) || 0;
  const underMaintenance = openMaintenanceQty(equipment.id, maintenance);
  const reserved = (reservations || [])
    .filter(
      (r) =>
        r.equipment_id === equipment.id &&
        ACTIVE_RES_STATUSES.includes(r.status) &&
        (!date || r.event_date === date)
    )
    .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  return { total, underMaintenance, reserved, free: Math.max(0, total - underMaintenance - reserved) };
}

// Can this specific unit be reserved for this date?
// blocked = hard no (maintenance/damaged/retired); conflict = needs a manager override
export function unitStatusCheck(unit, reservations, date) {
  if (BLOCKED_UNIT_STATUSES.includes(unit.status)) {
    return { blocked: true, reason: `Unit is ${unit.status.replace(/_/g, " ")}` };
  }
  const clash = (reservations || []).find(
    (r) => r.unit_id === unit.id && ACTIVE_RES_STATUSES.includes(r.status) && (!date || r.event_date === date)
  );
  if (clash) return { conflict: true, reason: `Booked for "${clash.event_name}" on ${clash.event_date}` };
  if (unit.status === "in_use") {
    return {
      conflict: true,
      reason: `Currently out${unit.current_event_name ? ` at "${unit.current_event_name}"` : ""} — not yet returned`,
    };
  }
  return {};
}

// Availability summary for a unit-tracked item
export function unitAvailability(equipment, units, reservations, date) {
  const mine = (units || []).filter((u) => u.equipment_id === equipment.id);
  let free = 0, underMaintenance = 0, reserved = 0;
  mine.forEach((u) => {
    const c = unitStatusCheck(u, reservations, date);
    if (c.blocked) underMaintenance++;
    else if (c.conflict) reserved++;
    else free++;
  });
  return { total: mine.length, underMaintenance, reserved, free };
}

export function equipmentAvailability(equipment, units, reservations, maintenance, date) {
  return equipment.tracking_mode === "unit"
    ? unitAvailability(equipment, units, reservations, date)
    : bulkAvailability(equipment, reservations, maintenance, date);
}

// Send reserved equipment out to the event
export async function dispatchReservation(reservation, userEmail) {
  await base44.entities.CateringEquipmentReservation.update(reservation.id, {
    status: "dispatched",
    dispatched_date: new Date().toISOString(),
  });
  if (reservation.unit_id) {
    await base44.entities.CateringEquipmentUnit.update(reservation.unit_id, {
      status: "in_use",
      current_location_type: "event",
      current_location_name: reservation.event_name || "",
      current_event_id: reservation.event_id,
      current_event_name: reservation.event_name || "",
    });
  }
}

// Check equipment back in after the event, logging damage/shortfall against it
export async function returnReservation({ reservation, returnedQty, damagedQty, missingQty, notes, damageCost }) {
  const { data } = await base44.functions.invoke('checkInCateringEquipment', {
    reservation_id: reservation.id, returned_quantity: returnedQty,
    damaged_quantity: damagedQty, missing_quantity: missingQty,
    damage_cost: damageCost, notes,
  });
  return data;
}

// Release every live equipment reservation an event holds (cancellation / manual release)
export async function releaseEquipmentForEvent({ eventId, userEmail, reason }) {
  const rows = await base44.entities.CateringEquipmentReservation.filter({ event_id: eventId });
  const active = rows.filter((r) => ["requested", ...ACTIVE_RES_STATUSES].includes(r.status));
  for (const r of active) {
    await base44.entities.CateringEquipmentReservation.update(r.id, {
      status: "released",
      released_by: userEmail || "",
      released_date: new Date().toISOString(),
      release_reason: reason || "",
    });
    if (r.unit_id) {
      const unit = await base44.entities.CateringEquipmentUnit.get(r.unit_id).catch(() => null);
      if (unit && unit.status === "in_use" && unit.current_event_id === eventId) {
        await base44.entities.CateringEquipmentUnit.update(unit.id, {
          status: "available",
          current_location_type: "branch",
          current_event_id: "",
          current_event_name: "",
        });
      }
    }
  }
  return { released: active.length };
}