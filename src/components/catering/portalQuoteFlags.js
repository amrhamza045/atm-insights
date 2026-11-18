/**
 * Normalises a raw settings record (global CateringSettings or a per-event
 * CateringPortalQuoteOverride) into the flags the customer portal reads.
 * Visibility flags default to visible when unset.
 */
export function normalizePortalFlags(s) {
  const flag = (key) => (s ? s[key] !== false : true);
  return {
    portal_show_line_items: flag("portal_show_line_items"),
    portal_show_quantities: flag("portal_show_quantities"),
    portal_show_line_prices: flag("portal_show_line_prices"),
    portal_show_charge_breakdown: flag("portal_show_charge_breakdown"),
    portal_show_service_costs: flag("portal_show_service_costs"),
    portal_show_payment_history: flag("portal_show_payment_history"),
    portal_show_balance_due: flag("portal_show_balance_due"),
    portal_hide_internal_notes: s ? s.portal_hide_internal_notes !== false : true,
    hidden_charge_allocation: s?.hidden_charge_allocation || "into_subtotal",
    portal_show_per_guest_price: !!s?.portal_show_per_guest_price,
    portal_hide_discount: !!s?.portal_hide_discount,
    portal_starting_from_mode: !!s?.portal_starting_from_mode,
    portal_package_only_mode: !!s?.portal_package_only_mode,
    portal_round_total_to: s?.portal_round_total_to || 0,
    portal_label_subtotal: s?.portal_label_subtotal || "",
    portal_label_service_charge: s?.portal_label_service_charge || "",
    portal_label_tax: s?.portal_label_tax || "",
    portal_label_total: s?.portal_label_total || "",
  };
}