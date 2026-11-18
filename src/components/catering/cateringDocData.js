/**
 * Assembles the document payload (lines, totals, paid-to-date) for a catering
 * document. Pure presentation assembly — it never recomputes billing, it only
 * reads what the quote / reconciliation already stored.
 */
const staffingTotalOf = (sc) =>
  sc.staffing_total ?? (sc.staffing || []).reduce((s, r) => s + (Number(r.subtotal) || 0), 0);

export function buildCateringDocData({ type, event, quote, payments = [], reconciliation, serviceCosts = null }) {
  if (!event) return null;

  const deposits = payments.filter((p) => p.payment_type === "deposit" && p.status === "completed");
  const credits = payments.filter((p) => p.payment_type === "refund" && p.status === "completed");
  const paid = payments
    .filter((p) => p.status === "completed" && p.payment_type !== "penalty")
    .reduce((s, p) => s + (p.payment_type === "refund" ? -1 : 1) * (Number(p.amount) || 0), 0);

  const lines =
    type === "final_invoice" && reconciliation
      ? [
          {
            name: `Catering services — ${reconciliation.billable_guests} billable guest(s)`,
            quantity: 1,
            unit_price: reconciliation.quote_total + (reconciliation.guest_adjustment || 0),
            line_total: reconciliation.quote_total + (reconciliation.guest_adjustment || 0),
          },
          ...(reconciliation.additional_charges || []).map((c) => ({ name: c.label, quantity: 1, unit_price: c.amount, line_total: c.amount })),
        ]
      : quote?.line_items || [];

  // Staffing & logistics are billed on quotations and invoices as their own lines
  const billService = type !== "deposit_receipt" && type !== "credit_note" && serviceCosts && !serviceCosts.error;
  const serviceLines = billService
    ? [
        // One staffing line: people and hours per role, a single total — no per-role amounts.
        ...((serviceCosts.staffing || []).length
          ? [{
              name: `Staffing — ${serviceCosts.staffing.map((r) => `${r.role_name} × ${r.people} (${r.hours} h)`).join(", ")}`,
              quantity: 1,
              unit_price: staffingTotalOf(serviceCosts),
              line_total: staffingTotalOf(serviceCosts),
            }]
          : []),
        ...(serviceCosts.logistics || []).map((t) => ({
          name: `Logistics — ${t.label}`,
          quantity: 1,
          unit_price: t.subtotal,
          line_total: t.subtotal,
        })),
      ]
    : [];
  const serviceTotal = billService ? serviceCosts.grand_total || 0 : 0;

  const total =
    type === "final_invoice" && reconciliation
      ? reconciliation.final_billing_total
      : type === "deposit_receipt"
      ? deposits.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : type === "credit_note"
      ? credits.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : Number(quote?.total ?? event.quote_total) || 0;

  return {
    lines: [...lines, ...serviceLines],
    total: total + serviceTotal,
    serviceTotal,
    paid,
    deposits,
    credits,
    number: `${type.toUpperCase().slice(0, 3)}-${event.id.slice(-6)}`,
  };
}