import { base44 } from "@/api/base44Client";

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const isValidDateInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** Local calendar date as YYYY-MM-DD, matching what a date input produces. */
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function deriveDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // event crosses midnight
  return round2(mins / 60);
}

/** Business validations that must never reach the database. */
export function validateEvent(data, { previousDate } = {}) {
  const errors = [];
  if (!data.client_id) errors.push("Select a client for the event.");
  if (!data.event_type?.trim()) errors.push("Event type is required.");
  if (!data.event_date) errors.push("Event date is required.");
  else if (!isValidDateInput(data.event_date)) errors.push("Event date must use a valid four-digit year between 2000 and 2100.");
  // Booking or rescheduling can only target today or a future date. Editing an
  // existing past event without touching its date stays allowed.
  else if (data.event_date !== previousDate && data.event_date < todayKey()) {
    errors.push("Event date cannot be in the past.");
  }
  if (data.guarantee_cutoff_date && !isValidDateInput(data.guarantee_cutoff_date)) errors.push("Guarantee cutoff must use a valid four-digit year between 2000 and 2100.");
  if (!data.branch_id) errors.push("No branch is selected — catering events must belong to a branch.");

  const expected = Number(data.expected_guests) || 0;
  const guaranteed = Number(data.guaranteed_guests) || 0;
  if (expected <= 0) errors.push("Expected guest count must be greater than zero.");
  if (guaranteed < 0) errors.push("Guaranteed guest count cannot be negative.");
  if (guaranteed > expected) errors.push("Guaranteed guest count cannot exceed the expected guest count.");

  if (data.guarantee_cutoff_date && data.event_date && data.guarantee_cutoff_date >= data.event_date) {
    errors.push("Guarantee cutoff date must fall before the event date.");
  }
  if (data.location_type === "off_site" && !data.venue_address?.trim()) {
    errors.push("Off-site events require a venue address.");
  }
  return errors;
}

export function computeQuoteTotals(lineItems = [], taxRate = 0, serviceRate = 0, discountAmount = 0, depositPercentage = 50) {
  let subtotal = 0;
  let estimatedCost = 0;
  let taxableBase = 0;
  let serviceBase = 0;
  let lineDiscountTotal = 0;

  const lines = lineItems.map((li) => {
    const qty = Number(li.quantity) || 0;
    const price = Number(li.unit_price) || 0;
    const cost = Number(li.unit_cost) || 0;
    const gross = round2(qty * price);
    const dv = Math.max(0, Number(li.discount_value) || 0);
    const mode = li.discount_mode === "amount" ? "amount" : "percent";
    const lineDiscount = round2(Math.min(gross, mode === "percent" ? (gross * Math.min(dv, 100)) / 100 : dv));
    const lineTotal = round2(gross - lineDiscount);
    const lineCost = round2(qty * cost);
    lineDiscountTotal += lineDiscount;
    subtotal += lineTotal;
    estimatedCost += lineCost;
    if (!li.tax_exempt) taxableBase += lineTotal;
    if (!li.service_exempt) serviceBase += lineTotal;
    return { ...li, quantity: qty, unit_price: price, unit_cost: cost, discount_value: dv, discount_mode: mode, discount_amount: lineDiscount, line_total: lineTotal, line_cost: lineCost };
  });

  const taxTotal = round2((taxableBase * (Number(taxRate) || 0)) / 100);
  const serviceTotal = round2((serviceBase * (Number(serviceRate) || 0)) / 100);
  const total = round2(subtotal + taxTotal + serviceTotal - (Number(discountAmount) || 0));

  return {
    lines,
    subtotal: round2(subtotal),
    line_discount_total: round2(lineDiscountTotal),
    tax_total: taxTotal,
    service_charge_total: serviceTotal,
    total,
    estimated_cost: round2(estimatedCost),
    estimated_margin: round2(total - estimatedCost),
    required_deposit: round2((total * (Number(depositPercentage) || 0)) / 100),
  };
}

/**
 * Synchronous credit exposure check at the moment of quote creation.
 * Exposure = value of the client's other active quotes (net of payments already received)
 *            + the client's outstanding catering balance + this new quote total.
 */
export async function checkCreditExposure({ clientId, creditLimit, newQuoteTotal, excludeEventId }) {
  const [activeQuotes, payments] = await Promise.all([
    base44.entities.CateringQuote.filter({ client_id: clientId, status: "active" }),
    base44.entities.CateringPayment.filter({ client_id: clientId, status: "completed" }),
  ]);

  const otherQuotes = activeQuotes.filter((q) => q.event_id !== excludeEventId);
  const committed = otherQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
  const otherEventIds = new Set(otherQuotes.map((q) => q.event_id));
  const paidOnOthers = payments
    .filter((p) => otherEventIds.has(p.event_id) && p.payment_type !== "refund")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const openOnOthers = Math.max(0, committed - paidOnOthers);
  const exposure = round2(openOnOthers + (Number(newQuoteTotal) || 0));
  const limit = Number(creditLimit) || 0;
  const withinLimit = limit <= 0 ? true : exposure <= limit;

  return { exposure, limit, withinLimit, openOnOthers: round2(openOnOthers), limitApplies: limit > 0 };
}

/** Resolve the penalty tier for a cancellation, given the applicable policy. */
export function resolveCancellation(policy, daysBeforeEvent, quoteTotal) {
  const tiers = (policy?.tiers || []).slice().sort((a, b) => b.min_days_before - a.min_days_before);
  const tier = tiers.find((t) => daysBeforeEvent >= (Number(t.min_days_before) || 0)) || tiers[tiers.length - 1];
  const pct = Number(tier?.penalty_percentage) || 0;
  return {
    tier: tier || null,
    penalty_percentage: pct,
    penalty_amount: round2(((Number(quoteTotal) || 0) * pct) / 100),
    deposit_refundable: !!tier?.deposit_refundable,
  };
}

export function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}