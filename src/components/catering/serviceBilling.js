import { base44 } from "@/api/base44Client";
import { round2 } from "./cateringLogic";
import { hasPaymentPolicy, refreshEventPolicy } from "./payment-policies/eventPolicyClient";

/** Staffing + logistics an event has committed — billed to the customer on top of the food quote. */
export function serviceTotalsFrom({ assignments = [], trips = [] }) {
  const staffing = round2(
    assignments.filter((a) => a.status !== "released").reduce((s, a) => s + (Number(a.estimated_cost) || 0), 0)
  );
  const logistics = round2(
    trips.filter((t) => t.stage !== "cancelled").reduce((s, t) => s + (Number(t.estimated_transport_cost) || 0), 0)
  );
  return { staffing, logistics, total: round2(staffing + logistics) };
}

/** Per-role / per-trip lines, in the shape the customer documents and portal use. */
export function serviceLinesFrom({ assignments = [], trips = [] }) {
  const roleMap = {};
  assignments
    .filter((a) => a.status !== "released")
    .forEach((a) => {
      const key = a.role_name || "Staff";
      roleMap[key] = roleMap[key] || { role_name: key, people: 0, hours: 0, subtotal: 0 };
      roleMap[key].people += 1;
      roleMap[key].hours += Number(a.expected_hours) || 0;
      roleMap[key].subtotal += Number(a.estimated_cost) || 0;
    });
  const logistics = trips
    .filter((t) => t.stage !== "cancelled")
    .map((t) => ({ label: t.trip_label || t.vehicle_name || "Transport", subtotal: Number(t.estimated_transport_cost) || 0 }));
  const totals = serviceTotalsFrom({ assignments, trips });
  return { staffing: Object.values(roleMap), staffing_total: totals.staffing, logistics, grand_total: totals.total };
}

export async function loadServiceRecords(eventId) {
  const [assignments, trips] = await Promise.all([
    base44.entities.CateringAssignment.filter({ event_id: eventId }),
    base44.entities.CateringTrip.filter({ event_id: eventId }),
  ]);
  return { assignments, trips };
}

/** Full amount the customer owes: food quote + staffing + logistics. */
export function eventTotal(event, serviceTotal = 0) {
  return round2((Number(event?.quote_total) || 0) + (Number(serviceTotal) || 0));
}

/**
 * Recompute the deposit and balance from the full event total so every
 * customer-facing figure moves together whenever staffing, logistics or the
 * quote changes.
 */
export async function syncEventBilling(event) {
  if (!event?.id) return null;
  const records = await loadServiceRecords(event.id);
  const { total } = serviceTotalsFrom(records);
  const grand = eventTotal(event, total);
  // Booked under a payment policy: the server sets the deposit from the policy.
  if (hasPaymentPolicy(event)) {
    await refreshEventPolicy(event.id);
  } else {
    const pct = Number(event.deposit_percentage ?? 50);
    await base44.entities.CateringEvent.update(event.id, {
      required_deposit_amount: round2((grand * pct) / 100),
      balance_due: round2(grand - (Number(event.total_paid) || 0)),
    });
  }
  return { serviceTotal: total, eventTotal: grand };
}