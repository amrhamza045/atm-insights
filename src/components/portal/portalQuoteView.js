/**
 * Computes exactly what the customer should see for one quote, given the
 * Client-side quote settings. Never mutates the quote — the amounts the business
 * charges stay the same; this only reshapes the presentation.
 */
export function buildPortalQuoteView(quote, vis, { serviceTotal = 0, guests = 0 } = {}) {
  if (!quote) return null;

  const lines = (quote.line_items || []).map((l) => ({
    name: l.name,
    quantity: l.quantity || 1,
    amount: l.line_total || 0,
  }));

  const service = quote.service_charge_total || 0;
  const tax = quote.tax_total || 0;
  const discount = quote.discount_amount || 0;

  const showBreakdown = vis.portal_show_charge_breakdown;
  const showServiceCosts = vis.portal_show_service_costs;

  // Amounts the customer still pays but will not see as their own line.
  let hidden = 0;
  if (!showBreakdown) hidden += service + tax;
  if (!showServiceCosts) hidden += serviceTotal;

  const mode = vis.hidden_charge_allocation || "into_subtotal";

  let displayLines = lines;
  let displaySubtotal = quote.subtotal || 0;

  if (hidden > 0 && mode === "into_lines") {
    const base = lines.reduce((s, l) => s + l.amount, 0);
    if (base > 0) {
      displayLines = lines.map((l) => ({ ...l, amount: l.amount + hidden * (l.amount / base) }));
      displaySubtotal = displayLines.reduce((s, l) => s + l.amount, 0);
    } else {
      displaySubtotal = displaySubtotal + hidden;
    }
  } else if (hidden > 0 && mode === "into_subtotal") {
    displaySubtotal = displaySubtotal + hidden;
  }

  let total = (quote.total || 0) + (showServiceCosts ? 0 : serviceTotal);

  const roundTo = vis.portal_round_total_to || 0;
  if (roundTo > 0) total = Math.round(total / roundTo) * roundTo;

  const perGuest = guests > 0 ? total / guests : 0;

  return {
    lines: displayLines,
    subtotal: displaySubtotal,
    service,
    tax,
    discount,
    total,
    perGuest,
    showBreakdown,
    showDiscount: showBreakdown && !vis.portal_hide_discount && !!discount,
    showLines: vis.portal_show_line_items && !vis.portal_package_only_mode && !vis.portal_starting_from_mode,
    showQuantities: vis.portal_show_quantities,
    showLinePrices: vis.portal_show_line_prices,
    startingFrom: !!vis.portal_starting_from_mode,
    packageOnly: !!vis.portal_package_only_mode,
    showPerGuest: !!vis.portal_show_per_guest_price && guests > 0,
    labels: {
      subtotal: vis.portal_label_subtotal || "Subtotal",
      service: vis.portal_label_service_charge || "Service charge",
      tax: vis.portal_label_tax || "Tax",
      discount: "Discount",
      total: vis.portal_label_total || "Total",
    },
  };
}