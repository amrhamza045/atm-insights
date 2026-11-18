import { base44 } from "@/api/base44Client";
import { computeQuoteTotals, round2 } from "./cateringLogic";
import { syncEventBilling } from "./serviceBilling";
import { refreshEventRequisitionBaseline } from "./requisition/requisitionFlow";

/**
 * Rescale one quote's lines from the guest count it was built for to a new one.
 * Per-guest lines (quantity that tracked guests) scale proportionally; single-unit
 * lines stay fixed, except a package charge line whose price is per-guest based —
 * that one scales its price and its "(N guests)" label.
 */
export function rescaleLines(lines = [], oldGuests, newGuests) {
  const ratio = newGuests / oldGuests;
  return lines.map((l) => {
    const qty = Number(l.quantity) || 0;
    const isPackageCharge = /package charge/i.test(l.name || "");
    if (isPackageCharge) {
      return {
        ...l,
        unit_price: round2((Number(l.unit_price) || 0) * ratio),
        name: (l.name || "").replace(/\(\d+\s*guests\)/i, `(${newGuests} guests)`),
      };
    }
    if (qty <= 1) return { ...l };
    return { ...l, quantity: Math.max(1, Math.round(qty * ratio)) };
  });
}

/**
 * Recalculate the event's active quote after its guest count changed.
 * Returns null when there is nothing to rescale.
 */
export async function rescaleActiveQuoteForGuests(event, newGuests) {
  if (!event?.active_quote_id || !(newGuests > 0)) return null;
  const quote = await base44.entities.CateringQuote.get(event.active_quote_id);
  if (!quote) return null;
  const oldGuests = Number(quote.guests_at_quote) || 0;
  if (!(oldGuests > 0) || oldGuests === newGuests) return null;

  const lines = rescaleLines(quote.line_items, oldGuests, newGuests);
  const totals = computeQuoteTotals(
    lines,
    quote.tax_rate || 0,
    quote.service_charge_rate || 0,
    quote.discount_amount || 0,
    event.deposit_percentage ?? 50
  );

  await base44.entities.CateringQuote.update(quote.id, {
    line_items: totals.lines,
    subtotal: totals.subtotal,
    tax_total: totals.tax_total,
    service_charge_total: totals.service_charge_total,
    total: totals.total,
    estimated_cost: totals.estimated_cost,
    estimated_margin: totals.estimated_margin,
    estimated_margin_percentage: totals.total > 0 ? round2((totals.estimated_margin / totals.total) * 100) : 0,
    required_deposit: totals.required_deposit,
    guests_at_quote: newGuests,
  });

  await base44.entities.CateringEvent.update(event.id, { quote_total: totals.total });
  await syncEventBilling({ ...event, quote_total: totals.total });
  await refreshEventRequisitionBaseline(event.id);

  return { oldGuests, newGuests, total: totals.total, revision: quote.revision_number };
}