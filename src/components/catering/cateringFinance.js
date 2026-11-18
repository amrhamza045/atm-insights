import { base44 } from "@/api/base44Client";
import { round2 } from "./cateringLogic";
import { equipmentUsageCost, tripTransportCost } from "./eventCosts";
import { serviceTotalsFrom } from "./serviceBilling";

// Ledger posting, credit notes and voids run only on the server
// (recordCateringPayment, issueCateringCreditNote, voidCateringPayment).

/**
 * Rebuild total_paid / deposit_paid_amount / deposit_status / balance_due from the
 * event's completed payments. Refunds, withdrawals and penalties (kept from the
 * deposit) come off the deposit first. A confirmed event
 * whose deposit is no longer covered drops back to deposit_pending.
 */
export class DepositNotCoveredError extends Error {
  constructor(required, paid) {
    super(`The active quote requires a deposit of ${required.toLocaleString()} EGP but only ${paid.toLocaleString()} EGP is covered by recorded payments (refunds/credit notes included). Record the additional deposit first.`);
    this.name = "DepositNotCoveredError";
  }
}

/** Deposit the given quote revision requires. */
export function quoteRequiredDeposit(quote, event) {
  // Booked under a payment policy: the server keeps the deposit in step with the policy.
  if (event?.payment_policy_id) return round2(Number(event.required_deposit_amount) || 0);
  const stored = Number(quote?.required_deposit) || 0;
  if (stored > 0) return round2(stored);
  const pct = Number(quote?.deposit_percentage ?? event?.deposit_percentage) || 0;
  return round2(((Number(quote?.total) || 0) * pct) / 100);
}

/**
 * Gate: re-reads the event, rebuilds its payment totals from the live ledger and
 * checks the deposit against the ACTIVE quote revision. Throws DepositNotCoveredError.
 */
export async function assertDepositCoversQuote({ eventId, quote }) {
  const fresh = await base44.entities.CateringEvent.get(eventId);
  const required = quoteRequiredDeposit(quote, fresh);
  const res = await recomputeEventPaymentTotals({ event: fresh, requiredDeposit: required });
  if (res.depositStatus !== "paid") throw new DepositNotCoveredError(required, res.depositPaid);
  return res;
}

export async function recomputeEventPaymentTotals({ event, grandTotal, excludeId, requiredDeposit }) {
  const total = grandTotal ?? round2((Number(event.total_paid) || 0) + (Number(event.balance_due) || 0));
  const remaining = (await base44.entities.CateringPayment.filter({ event_id: event.id })).filter(
    (p) => p.status === "completed" && p.id !== excludeId
  );
  const sum = (fn) => round2(remaining.filter(fn).reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const takenOff = (p) => ["refund", "deposit_withdrawal", "penalty"].includes(p.payment_type);
  const outgoing = sum(takenOff);
  const totalPaid = round2(sum((p) => !takenOff(p)) - outgoing);
  const depositPaid = Math.max(0, round2(sum((p) => p.payment_type === "deposit") - outgoing));
  const required = requiredDeposit ?? (Number(event.required_deposit_amount) || 0);
  const grandTotal_ = total;
  const depositStatus = depositPaid <= 0 ? "none" : required > 0 && depositPaid >= required ? "paid" : "partial";

  await base44.entities.CateringEvent.update(event.id, {
    total_paid: totalPaid,
    deposit_paid_amount: depositPaid,
    balance_due: round2(grandTotal_ - totalPaid),
    deposit_status: depositStatus,
    ...(requiredDeposit != null ? { required_deposit_amount: required } : {}),
    ...((event.status === "confirmed" || event.status === "in_progress") && depositStatus !== "paid" ? { status: "deposit_pending" } : {}),
  });
  return { depositStatus, depositPaid, required };
}

/**
 * After a quote revision is created or edited: set the event's deposit floor to the
 * revision's, re-check the live ledger and, when no longer covered, demote the event
 * and send its reservation back to the manager approval queue. Reservations
 * themselves are left untouched.
 */
export async function reverifyDepositForRevision({ eventId, quote }) {
  const fresh = await base44.entities.CateringEvent.get(eventId);
  const required = quoteRequiredDeposit(quote, fresh);
  const res = await recomputeEventPaymentTotals({ event: fresh, requiredDeposit: required });
  if (res.depositStatus === "paid" || required <= 0) return { covered: true, ...res };
  const requeue = fresh.reservation_status === "reserved" || fresh.reservation_status === "shortfall";
  if (requeue) {
    await base44.entities.CateringEvent.update(eventId, {
      reservation_status: "pending_approval",
      reservation_approved_by: "",
      reservation_approved_date: "",
    });
  }
  const demoted = fresh.status === "confirmed" || fresh.status === "in_progress";
  return { covered: false, demoted, requeued: requeue, event: fresh, ...res };
}

/** All the cost and revenue data one event generated across Phases 3–9. */
export async function loadEventFinance(event) {
  const [payments, quotes, orders, pos, trips, maintenance, reconciliations, equipRes, equipment, assignments] = await Promise.all([
    base44.entities.CateringPayment.filter({ event_id: event.id }),
    base44.entities.CateringQuote.filter({ event_id: event.id }),
    base44.entities.ProductionOrder.filter({ catering_event_id: event.id }),
    base44.entities.PurchaseOrder.filter({ catering_event_id: event.id }),
    base44.entities.CateringTrip.filter({ event_id: event.id }),
    base44.entities.CateringEquipmentMaintenance.filter({ event_id: event.id }),
    base44.entities.CateringReconciliation.filter({ event_id: event.id }),
    base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }),
    base44.entities.CateringEquipment.list("-created_date", 500),
    base44.entities.CateringAssignment.filter({ event_id: event.id }),
  ]);
  return { payments, quotes, orders, pos, trips, maintenance, equipRes, equipment, assignments, reconciliation: reconciliations[0] || null };
}

/**
 * Actual vs estimated profitability for one event.
 * Revenue actual = collected payments net of refunds (falls back to the final billing
 * total when it is finalised); estimate comes from the active quote (Phase 3).
 */
export function eventProfitability(event, data) {
  const { payments = [], quotes = [], orders = [], pos = [], trips = [], maintenance = [], equipRes = [], equipment = [], assignments = [], reconciliation = null } = data || {};
  const quote = quotes.find((q) => q.id === event.active_quote_id) || quotes.find((q) => q.status === "active") || null;

  const collected = round2(
    payments
      .filter((p) => p.status === "completed" && p.payment_type !== "penalty")
      .reduce((s, p) => s + (p.payment_type === "refund" || p.payment_type === "deposit_withdrawal" ? -1 : 1) * (Number(p.amount) || 0), 0)
  );
  const billed = Number(reconciliation?.final_billing_total) || 0;
  const revenueActual = billed > 0 ? billed : collected;
  // Staffing and logistics are charged on to the customer on top of the food quote,
  // so they belong in the quoted revenue as well as in the cost.
  const serviceBilled = serviceTotalsFrom({ assignments, trips }).total;
  const revenueEstimate = round2((Number(quote?.total ?? event.quote_total) || 0) + serviceBilled);

  // Food is counted once: the event's actual food cost (stock released to the event at purchase
  // cost, plus extra waste, less reusable returns), set when its actual costs are calculated.
  // Production batches cook that released stock and purchase orders only refill stock, so both
  // stay visible for reference and are never added on top.
  const foodReady = event.actual_food_cost !== null && event.actual_food_cost !== undefined;
  const foodCost = foodReady ? round2(Number(event.actual_food_cost) || 0) : 0;
  const productionCost = round2(orders.filter((o) => o.status === "completed").reduce((s, o) => s + (Number(o.total_cost) || 0), 0));
  const procurementCost = round2(pos.filter((p) => p.status !== "cancelled").reduce((s, p) => s + (Number(p.total_amount) || 0), 0));
  const laborCost = round2(Number(event.estimated_labor_cost) || 0);
  const transportCostTotal = tripTransportCost(trips);
  const equipmentUsage = equipmentUsageCost(equipRes, equipment);
  const equipmentDamage = round2(maintenance.reduce((s, m) => s + (Number(m.cost) || 0), 0));
  const equipmentCost = round2(equipmentUsage + equipmentDamage);

  const costActual = round2(foodCost + laborCost + transportCostTotal + equipmentCost);
  const costEstimate = round2((Number(quote?.estimated_cost) || 0) + serviceBilled);

  const profitActual = round2(revenueActual - costActual);
  const profitEstimate = round2(revenueEstimate - costEstimate);
  const marginActual = revenueActual > 0 ? round2((profitActual / revenueActual) * 100) : 0;
  const marginEstimate = revenueEstimate > 0 ? round2((profitEstimate / revenueEstimate) * 100) : 0;

  return {
    event,
    quote,
    reconciliation,
    collected,
    revenueActual,
    revenueEstimate,
    costs: {
      food: foodCost,
      foodReady,
      production: productionCost,
      procurement: procurementCost,
      labor: laborCost,
      transport: transportCostTotal,
      equipment: equipmentCost,
      equipmentUsage,
      equipmentDamage,
    },
    costActual,
    costEstimate,
    profitActual,
    profitEstimate,
    marginActual,
    marginEstimate,
    marginVariance: round2(marginActual - marginEstimate),
    // Dimensions for the rollups
    clientName: event.client_name || "Unknown client",
    eventType: event.event_type || "Unspecified",
    packageName: quote?.package_name || "No package",
    branchName: event.branch_name || "Unassigned branch",
    ownerEmail: quote?.created_by_email || "Unassigned",
    month: (event.event_date || "").slice(0, 7),
  };
}

/** Batch version — one fetch per entity type for the whole branch, then grouped per event. */
export async function loadBranchFinance(branchId) {
  const [events, payments, quotes, orders, pos, trips, maintenance, reconciliations, equipRes, equipment, assignments] = await Promise.all([
    base44.entities.CateringEvent.filter({ branch_id: branchId }, "-event_date", 500),
    base44.entities.CateringPayment.filter({ branch_id: branchId }, "-payment_date", 1000),
    base44.entities.CateringQuote.filter({ branch_id: branchId }, "-created_date", 1000),
    base44.entities.ProductionOrder.filter({ order_source: "catering" }, "-created_date", 1000),
    base44.entities.PurchaseOrder.filter({ order_source: "catering" }, "-created_date", 1000),
    base44.entities.CateringTrip.filter({ branch_id: branchId }, "-created_date", 1000),
    base44.entities.CateringEquipmentMaintenance.list("-created_date", 1000),
    base44.entities.CateringReconciliation.filter({ branch_id: branchId }, "-created_date", 500),
    base44.entities.CateringEquipmentReservation.filter({ branch_id: branchId }, "-created_date", 2000),
    base44.entities.CateringEquipment.list("-created_date", 500),
    base44.entities.CateringAssignment.filter({ branch_id: branchId }, "-created_date", 2000),
  ]);
  const forEvent = (arr, key = "event_id", id) => arr.filter((r) => r[key] === id);
  return events.map((ev) =>
    eventProfitability(ev, {
      payments: forEvent(payments, "event_id", ev.id),
      quotes: forEvent(quotes, "event_id", ev.id),
      orders: forEvent(orders, "catering_event_id", ev.id),
      pos: forEvent(pos, "catering_event_id", ev.id),
      trips: forEvent(trips, "event_id", ev.id),
      maintenance: forEvent(maintenance, "event_id", ev.id),
      equipRes: forEvent(equipRes, "event_id", ev.id),
      equipment,
      assignments: forEvent(assignments, "event_id", ev.id),
      reconciliation: reconciliations.find((r) => r.event_id === ev.id) || null,
    })
  );
}

export function rollup(rows, dimension) {
  const map = {};
  rows.forEach((r) => {
    const key = r[dimension] || "—";
    map[key] = map[key] || { key, events: 0, revenue: 0, cost: 0, revenueEstimate: 0, costEstimate: 0 };
    map[key].events += 1;
    map[key].revenue += r.revenueActual;
    map[key].cost += r.costActual;
    map[key].revenueEstimate += r.revenueEstimate;
    map[key].costEstimate += r.costEstimate;
  });
  return Object.values(map)
    .map((g) => ({
      ...g,
      revenue: round2(g.revenue),
      cost: round2(g.cost),
      profit: round2(g.revenue - g.cost),
      margin: g.revenue > 0 ? round2(((g.revenue - g.cost) / g.revenue) * 100) : 0,
      estimatedMargin: g.revenueEstimate > 0 ? round2(((g.revenueEstimate - g.costEstimate) / g.revenueEstimate) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function monthlyTrend(rows) {
  return rollup(rows.filter((r) => r.month), "month").sort((a, b) => a.key.localeCompare(b.key));
}

export function totals(rows) {
  const revenue = round2(rows.reduce((s, r) => s + r.revenueActual, 0));
  const cost = round2(rows.reduce((s, r) => s + r.costActual, 0));
  const revenueEstimate = round2(rows.reduce((s, r) => s + r.revenueEstimate, 0));
  const costEstimate = round2(rows.reduce((s, r) => s + r.costEstimate, 0));
  return {
    events: rows.length,
    revenue,
    cost,
    profit: round2(revenue - cost),
    margin: revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0,
    revenueEstimate,
    estimatedMargin: revenueEstimate > 0 ? round2(((revenueEstimate - costEstimate) / revenueEstimate) * 100) : 0,
  };
}