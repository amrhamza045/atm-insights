import { packagePaxTotal } from "./docLineGroups";

/** Labels for catering documents in both languages. Data values (item names,
 *  client names) are never translated — only the document chrome. */
export const DOC_STRINGS = {
  en: {
    dir: "ltr",
    titles: {
      quotation: "QUOTATION",
      deposit_receipt: "DEPOSIT RECEIPT",
      invoice: "INVOICE",
      final_invoice: "FINAL INVOICE",
      credit_note: "CREDIT NOTE",
    },
    issued: "Issued",
    client: "Client",
    event: "Event",
    validUntil: "Valid until",
    pricedFor: (n) => `Priced for ${n} guest(s)`,
    offSite: "Off-site",
    onSite: "On-site",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    lineTotal: "Total",
    noLines: "No lines on this document.",
    packageDetails: "Package description",
    subtotal: "Subtotal",
    tax: (r) => `Tax (${r}%)`,
    service: (r) => `Service charge (${r}%)`,
    discount: "Discount",
    staffingLogistics: "Staffing & logistics",
    billableGuests: (n) => `Catering services — ${n} billable guest(s)`,
    additionalCharges: "Additional charges",
    total: "Total",
    credited: "Credited",
    receivedToDate: "Received to date",
    balanceDue: "Balance due",
    refundOwed: "Refund owed to client",
    footer: "Catering revenue — recorded separately from restaurant (POS) sales.",
  },
  ar: {
    dir: "rtl",
    titles: {
      quotation: "عرض سعر",
      deposit_receipt: "إيصال دفعة مقدمة",
      invoice: "فاتورة",
      final_invoice: "الفاتورة النهائية",
      credit_note: "إشعار دائن",
    },
    issued: "تاريخ الإصدار",
    client: "العميل",
    event: "المناسبة",
    validUntil: "صالح حتى",
    pricedFor: (n) => `التسعير على أساس ${n} ضيف`,
    offSite: "خارج الفرع",
    onSite: "داخل الفرع",
    description: "الوصف",
    qty: "الكمية",
    unit: "سعر الوحدة",
    lineTotal: "الإجمالي",
    noLines: "لا توجد بنود في هذا المستند.",
    packageDetails: "وصف الباقة",
    subtotal: "الإجمالي الفرعي",
    tax: (r) => `الضريبة (${r}%)`,
    service: (r) => `رسوم الخدمة (${r}%)`,
    discount: "الخصم",
    staffingLogistics: "العمالة والنقل",
    billableGuests: (n) => `خدمات الضيافة — ${n} ضيف محتسب`,
    additionalCharges: "رسوم إضافية",
    total: "الإجمالي",
    credited: "المبلغ الدائن",
    receivedToDate: "المدفوع حتى الآن",
    balanceDue: "المبلغ المستحق",
    refundOwed: "مبلغ مستحق للعميل",
    footer: "إيرادات الضيافة — تُسجَّل بشكل منفصل عن مبيعات المطعم (نقاط البيع).",
  },
};

/** Shared meta/total rows so the English and Arabic renderers stay in sync. */
export function buildDocRows({ type, docData, quote, reconciliation, s }) {
  const rows = [];
  const showQuoteBreakdown = type === "quotation" || type === "invoice";
  if (showQuoteBreakdown && quote) {
    rows.push([s.subtotal, quote.subtotal || 0]);
    if (quote.tax_total) rows.push([s.tax(quote.tax_rate || 0), quote.tax_total]);
    if (quote.service_charge_total) rows.push([s.service(quote.service_charge_rate || 0), quote.service_charge_total]);
    if (quote.discount_amount) rows.push([s.discount, -quote.discount_amount]);
  }
  if (type === "final_invoice" && reconciliation) {
    rows.push([s.billableGuests(reconciliation.billable_guests), reconciliation.quote_total || 0]);
    if (reconciliation.additional_charges_total) rows.push([s.additionalCharges, reconciliation.additional_charges_total]);
  }
  if (docData.serviceTotal) rows.push([s.staffingLogistics, docData.serviceTotal]);
  return rows;
}

export function buildDocMeta({ type, event, docData, quote, s }) {
  const venue = event.location_type === "off_site" ? event.venue_name || s.offSite : event.branch_name || s.onSite;
  const meta = [
    `${docData.number}  ·  ${s.issued} ${new Date().toLocaleDateString()}`,
    `${s.client}: ${event.client_name || "—"}${event.client_phone ? `  ·  ${event.client_phone}` : ""}`,
    `${s.event}: ${event.event_name}  ·  ${event.event_date}${event.start_time ? ` ${event.start_time}` : ""}  ·  ${venue}`,
  ];
  if (type === "quotation" && quote?.valid_until) meta.push(`${s.validUntil}: ${quote.valid_until}`);
  const pricedGuests = packagePaxTotal(quote?.line_items) || quote?.guests_at_quote;
  if (pricedGuests) meta.push(s.pricedFor(pricedGuests));
  return meta;
}