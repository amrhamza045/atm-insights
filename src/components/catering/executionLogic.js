import { base44 } from "@/api/base44Client";
import { round2 } from "./cateringLogic";
import { ACTIVE_RES_STATUSES } from "./equipmentLogic";
import { ACTIVE_TRIP_STAGES, TRIP_STAGES } from "./logisticsLogic";
import { locationOf, siteCheck } from "./attendanceLocation";
import { logEventAudit } from "./eventAudit";
import { closeoutEventRequisition } from "./requisition/requisitionFlow";

/** Everything the execution view and the at-risk indicator need, in one fetch. */
export async function loadExecutionData(event) {
  const [orders, trips, assignments, attendance, equipRes, reservations, pos] = await Promise.all([
    base44.entities.ProductionOrder.filter({ catering_event_id: event.id }),
    base44.entities.CateringTrip.filter({ event_id: event.id }),
    base44.entities.CateringAssignment.filter({ event_id: event.id, status: "confirmed" }),
    base44.entities.Attendance.filter({ attendance_date: event.event_date }),
    base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }),
    base44.entities.CateringReservation.filter({ event_id: event.id }),
    base44.entities.PurchaseOrder.filter({ catering_event_id: event.id }),
  ]);
  return { orders, trips, assignments, attendance, equipRes, reservations, pos };
}

/** Production progress straight off Phase 4 order statuses — no new status set. */
export function productionProgress(orders) {
  const live = (orders || []).filter((o) => o.status !== "cancelled");
  const ready = live.filter((o) => o.status === "completed").length;
  const inProgress = live.filter((o) => o.status === "in_progress").length;
  const pending = live.filter((o) => o.status === "pending").length;
  return {
    total: live.length,
    ready,
    inProgress,
    pending,
    percent: live.length ? Math.round((ready / live.length) * 100) : 0,
    label: live.length ? `${ready} of ${live.length} batch(es) ready` : "No production batches planned",
  };
}

/** Dispatch progress off Phase 8 trip stages. */
export function dispatchProgress(trips) {
  const live = (trips || []).filter((t) => t.stage !== "cancelled");
  if (live.length === 0) return { total: 0, percent: 0, label: "No trips planned", stages: [] };
  const score = (t) => TRIP_STAGES.indexOf(t.stage);
  const percent = Math.round(
    (live.reduce((s, t) => s + Math.max(0, score(t)), 0) / (live.length * (TRIP_STAGES.length - 1))) * 100
  );
  const arrived = live.filter((t) => ["arrived", "returning", "returned"].includes(t.stage)).length;
  const dispatched = live.filter((t) => t.stage === "dispatched").length;
  const label =
    arrived === live.length
      ? "All trips arrived on site"
      : dispatched > 0
      ? `${dispatched} trip(s) dispatched, not yet arrived`
      : `${arrived} of ${live.length} trip(s) arrived`;
  return { total: live.length, percent, label, stages: live.map((t) => ({ id: t.id, name: t.trip_label || t.vehicle_name || "Trip", stage: t.stage })) };
}

/** Who's actually clocked in, matched against the Phase 6 crew via their generated shifts. */
export function attendanceRollup(assignments, attendance, event) {
  const rows = (assignments || []).map((a) => {
    const rec = (attendance || []).find(
      (r) => r.employee_id === a.employee_id && (!a.shift_id || !r.shift_id || r.shift_id === a.shift_id)
    );
    const warnings = [];
    if (a.event_date && event?.event_date && a.event_date !== event.event_date) {
      warnings.push(`Assignment is dated ${a.event_date}, but the event is on ${event.event_date}`);
    }
    if (!rec && (attendance || []).some((r) => r.employee_id === a.employee_id)) {
      warnings.push("Clock-in not linked: it belongs to a different shift than this assignment");
    }
    if (rec && a.shift_id && !rec.shift_id) {
      warnings.push("Clock-in needs review: no shift is linked to it");
    }
    return {
      assignment: a,
      warnings,
      clockedIn: !!rec?.sign_in_time,
      clockedOut: !!rec?.sign_out_time,
      status: rec?.status || "not_clocked_in",
      late: Number(rec?.late_minutes) || 0,
      expectedLocation: locationOf(a),
      site: siteCheck({ assignment: a, attendanceRecord: rec, event }),
    };
  });
  const present = rows.filter((r) => r.clockedIn).length;
  return {
    rows,
    present,
    total: rows.length,
    percent: rows.length ? Math.round((present / rows.length) * 100) : 0,
    label: rows.length ? `${present} of ${rows.length} crew clocked in` : "No crew assigned",
  };
}

/** One at-risk list drawn from Phases 5, 6 and 7 — nothing to hunt for across tabs. */
export function eventRisks(event, { equipRes, pos, reservations } = {}) {
  const risks = [];
  const unfilledCritical = Number(event?.staffing_unfilled_critical_count) || 0;
  if (unfilledCritical > 0) risks.push({ area: "Staffing", severity: "high", detail: `${unfilledCritical} critical role(s) unfilled` });
  else if (event?.staffing_status === "partially_staffed") risks.push({ area: "Staffing", severity: "low", detail: "Crew only partially staffed" });

  const openShortfall = Number(event?.open_shortfall_count) || 0;
  if (openShortfall > 0) risks.push({ area: "Procurement", severity: "high", detail: `${openShortfall} shortfall(s) with no live purchase order` });
  const undelivered = (pos || []).filter((p) => !["delivered", "cancelled"].includes(p.status)).length;
  if (undelivered > 0) risks.push({ area: "Procurement", severity: "medium", detail: `${undelivered} purchase order(s) not yet delivered` });
  const uncovered = (reservations || []).filter(
    (r) => r.status === "reserved" && (Number(r.shortfall_quantity) || 0) > 0 && r.procurement_status !== "po_delivered"
  ).length;
  if (uncovered > 0) risks.push({ area: "Stock", severity: "medium", detail: `${uncovered} reserved item(s) still short` });

  const requested = (equipRes || []).filter((r) => r.status === "requested").length;
  if (requested > 0) risks.push({ area: "Equipment", severity: "high", detail: `${requested} equipment request(s) not covered` });
  const overrides = (equipRes || []).filter((r) => r.had_conflict && ACTIVE_RES_STATUSES.includes(r.status)).length;
  if (overrides > 0) risks.push({ area: "Equipment", severity: "low", detail: `${overrides} double-booked item(s) held by override` });

  return risks;
}

export function riskLevel(risks) {
  if (risks.some((r) => r.severity === "high")) return "high";
  if (risks.some((r) => r.severity === "medium")) return "medium";
  if (risks.length) return "low";
  return "none";
}

/** Lightweight at-risk count off the event record alone — used on event cards. */
export function eventRiskCountFromRecord(event) {
  return (Number(event?.staffing_unfilled_critical_count) || 0) + (Number(event?.open_shortfall_count) || 0);
}

/**
 * Billing math. Once the guarantee cutoff has passed the billable count is the
 * guaranteed count — a lower actual turnout never reduces what is owed.
 */
export function computeBilling({ event, actualGuests, additionalCharges, quote }) {
  const guaranteed = Number(event?.guaranteed_guests) || 0;
  const actual = Number(actualGuests) || 0;
  const locked = !!event?.guarantee_locked;
  const billable = locked ? guaranteed : Math.max(actual, guaranteed);
  const basis = locked
    ? `Guarantee locked at cutoff — billed on ${guaranteed} guaranteed guest(s) regardless of the ${actual} who attended`
    : `Guarantee not locked — billed on the higher of actual (${actual}) and guaranteed (${guaranteed})`;

  const quoteTotal = Number(quote?.total ?? event?.quote_total) || 0;
  const pricedFor = Number(quote?.guests_at_quote) || 0;
  const perGuest = pricedFor > 0 ? quoteTotal / pricedFor : 0;
  const guestAdjustment = pricedFor > 0 ? round2((billable - pricedFor) * perGuest) : 0;

  const additionalTotal = round2((additionalCharges || []).reduce((s, c) => s + (Number(c.amount) || 0), 0));
  const finalTotal = round2(quoteTotal + guestAdjustment + additionalTotal);
  const paid = Number(event?.total_paid) || 0;

  return {
    locked,
    guaranteed,
    actual,
    billable,
    basis,
    quoteTotal,
    pricedFor,
    perGuest: round2(perGuest),
    guestAdjustment,
    additionalTotal,
    finalTotal,
    paid,
    balanceDue: round2(finalTotal - paid),
  };
}

export function equipmentCloseout(equipRes) {
  const rows = (equipRes || []).filter((r) => r.status !== "released");
  return {
    outstanding: rows.filter((r) => ACTIVE_RES_STATUSES.includes(r.status) || r.status === "requested").length,
    returned: rows.filter((r) => r.status === "returned").length,
    damaged: rows.reduce((s, r) => s + (Number(r.damaged_quantity) || 0), 0),
    missing: rows.reduce((s, r) => s + (Number(r.missing_quantity) || 0), 0),
    rows,
  };
}

export function inventoryCloseout(reservations) {
  const held = (reservations || []).filter((r) => r.status === "reserved");
  return { held: held.length, consumed: (reservations || []).filter((r) => r.status === "consumed").length, rows: held };
}

/** Release whatever stock the event still holds at closeout. */
export async function releaseRemainingInventory({ event, userEmail, closeout }) {
  // Requisition closeout first: a blocked requisition or unreleased batch stops it before any stock is touched.
  await closeoutEventRequisition(event, "stock", closeout);
  const rows = await base44.entities.CateringReservation.filter({ event_id: event.id, status: "reserved" });
  for (const r of rows) {
    await base44.entities.CateringReservation.update(r.id, {
      status: "consumed",
      released_by: userEmail || "",
      released_date: new Date().toISOString(),
      release_reason: "Event closeout — consumed at the event",
    });
  }
  await base44.entities.CateringEvent.update(event.id, { reservation_status: "released" });
  return rows.length;
}

/** Deliberate closure: only ever called from the confirm step in the UI. */
export async function finalizeReconciliation({ event, reconciliation, userEmail, closeout }) {
  await closeoutEventRequisition(event, "finalize", closeout);
  await base44.entities.CateringReconciliation.update(reconciliation.id, {
    status: "finalized",
    finalized_by: userEmail || "",
    finalized_date: new Date().toISOString(),
  });
  await base44.entities.CateringEvent.update(event.id, { status: "completed" });
  // Recognize COGS for what the event consumed; failures land in Finance › Posting issues.
  await base44.functions.invoke("postEventCogs", { event_id: event.id });
  logEventAudit("approve", event, "Finalized reconciliation — event completed", {
    status: { from: event.status, to: "completed" },
  });
}

export const ACTIVE_TRIPS = ACTIVE_TRIP_STAGES;