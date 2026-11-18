import { base44 } from "@/api/base44Client";
import { computeQuoteTotals, round2 } from "./cateringLogic";
import { hasPaymentPolicy, refreshEventPolicy } from "./payment-policies/eventPolicyClient";

/** Gross amount a discount is measured against (before discount). */
export function quoteGross(quote) {
  return round2(
    (Number(quote.subtotal) || 0) +
    (Number(quote.tax_total) || 0) +
    (Number(quote.service_charge_total) || 0)
  );
}

/** Resolve a percent/amount input into an EGP discount for one quote. */
export function resolveDiscount(quote, mode, value) {
  const base = quoteGross(quote);
  const num = Number(value) || 0;
  const discount = mode === "percent" ? round2((base * num) / 100) : round2(num);
  return Math.min(discount, base);
}

/** Write a discount onto a quote and re-sync its event's money fields. */
export async function applyQuoteDiscount({ quote, discount, reason, actorEmail }) {
  const totals = computeQuoteTotals(
    quote.line_items || [],
    quote.tax_rate,
    quote.service_charge_rate,
    discount,
    quote.deposit_percentage
  );
  const noteLine = `Discount ${discount} EGP applied by ${actorEmail || "staff"}${reason ? ` — ${reason}` : ""}`;

  await base44.entities.CateringQuote.update(quote.id, {
    discount_amount: discount,
    total: totals.total,
    required_deposit: totals.required_deposit,
    estimated_margin: totals.estimated_margin,
    estimated_margin_percentage: totals.total > 0 ? round2((totals.estimated_margin / totals.total) * 100) : 0,
    notes: [quote.notes, noteLine].filter(Boolean).join("\n"),
  });

  const event = await base44.entities.CateringEvent.get(quote.event_id);
  if (event && hasPaymentPolicy(event)) {
    // Booked under a payment policy: the server rebuilds the deposit and balance.
    await base44.entities.CateringEvent.update(event.id, { quote_total: totals.total });
    await refreshEventPolicy(event.id);
  } else if (event) {
    await base44.entities.CateringEvent.update(event.id, {
      quote_total: totals.total,
      required_deposit_amount: totals.required_deposit,
      balance_due: round2(totals.total - (Number(event.total_paid) || 0)),
    });
  }
  return totals;
}