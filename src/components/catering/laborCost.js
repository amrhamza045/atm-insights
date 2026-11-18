import { base44 } from "@/api/base44Client";
import { round2 } from "./cateringLogic";
import { hoursBetween, defaultWindow } from "./staffing";

/** Once an event is confirmed, its labor cost is frozen so later HR rate changes can't move the quote's margin. */
export const LOCKING_STATUSES = ["in_progress", "completed"];
export const isLockingStatus = (status) => LOCKING_STATUSES.includes(status);

/** Hours a slot is paid for: the assignment's own window when staffed, otherwise the event's planned window. */
export function plannedHours(event) {
  const fromEvent = Number(event?.duration_hours) || 0;
  if (fromEvent > 0) return round2(fromEvent + 2); // one hour setup + one hour breakdown, as staffing windows use
  const w = defaultWindow(event);
  return hoursBetween(w.start_time, w.end_time);
}

/**
 * Live labor cost, per role, for one event.
 * Each required slot is priced from the sharpest rate available: the assigned
 * employee's own rate when the slot is filled, otherwise the role default.
 */
export function computeLaborCost({ event, roles = [], assignments = [] }) {
  const hours = plannedHours(event);
  const requirements = event?.staffing_requirements || [];

  const rows = requirements.map((req) => {
    const role = roles.find((r) => r.name === req.role_name) || {};
    const basis = role.pay_basis === "flat_event" ? "flat_event" : "hourly";
    const defaultRate = basis === "flat_event" ? Number(role.default_flat_rate) || 0 : Number(role.default_hourly_rate) || 0;

    const filled = assignments.filter((a) => a.role_name === req.role_name);
    const required = Number(req.required_count) || 0;
    const unfilled = Math.max(0, required - filled.length);

    // Assignments carry their cost (frozen at confirmation); the role default covers any without one.
    const actualCost = filled.reduce((sum, a) => {
      const stored = Number(a.estimated_cost) || 0;
      if (stored > 0) return sum + stored;
      return sum + (basis === "flat_event" ? defaultRate : defaultRate * (Number(a.expected_hours) || hours));
    }, 0);
    const estimatedCost = unfilled * (basis === "flat_event" ? defaultRate : defaultRate * hours);

    const ratesKnown = defaultRate > 0 || filled.some((a) => (Number(a.estimated_cost) || 0) > 0);

    return {
      role_name: req.role_name,
      basis,
      default_rate: defaultRate,
      required,
      filled_count: filled.length,
      unfilled,
      hours: basis === "flat_event" ? 0 : hours,
      actual_cost: round2(actualCost),
      // Indicative only: what the still-unstaffed slots WOULD cost at the role
      // default. Never added into the event's labor cost, because a role with
      // nobody assigned has no committed cost and would inflate the event price.
      estimated_cost: round2(estimatedCost),
      subtotal: round2(actualCost),
      missing_rate: required > 0 && !ratesKnown,
    };
  });

  // Committed cost = assigned people only. Unstaffed slots stay outside the total.
  const total = round2(rows.reduce((s, r) => s + r.actual_cost, 0));
  const actualPortion = total;
  const unstaffedEstimate = round2(rows.reduce((s, r) => s + r.estimated_cost, 0));
  const unfilledSlots = rows.reduce((s, r) => s + r.unfilled, 0);
  const quoteTotal = Number(event?.quote_total) || 0;

  return {
    rows,
    hours,
    total,
    actualPortion,
    estimatedPortion: unstaffedEstimate,
    unstaffedEstimate,
    unfilledSlots,
    quoteTotal,
    marginAfterLabor: round2(quoteTotal - total),
    marginPercentage: quoteTotal > 0 ? round2(((quoteTotal - total) / quoteTotal) * 100) : 0,
    rolesMissingRate: rows.filter((r) => r.missing_rate).map((r) => r.role_name),
  };
}

/** Freeze the current calculation onto the event — the figure quotes and reports then read. */
export async function lockLaborCost({ event, calc, userEmail }) {
  await base44.entities.CateringEvent.update(event.id, {
    estimated_labor_cost: calc.total,
    labor_cost_locked: true,
    labor_cost_locked_date: new Date().toISOString(),
    labor_cost_locked_by: userEmail || "",
    labor_cost_breakdown: calc.rows.map((r) => ({
      role_name: r.role_name,
      pay_basis: r.basis,
      required_count: r.required,
      filled_count: r.filled_count,
      rate: r.default_rate,
      hours: r.hours,
      subtotal: r.subtotal,
    })),
  });
}

/** Keep the live figure on the event while it is still pre-confirmation. */
export async function syncLiveLaborCost({ event, calc }) {
  if (event.labor_cost_locked) return;
  if (round2(Number(event.estimated_labor_cost) || 0) === calc.total) return;
  await base44.entities.CateringEvent.update(event.id, { estimated_labor_cost: calc.total });
}