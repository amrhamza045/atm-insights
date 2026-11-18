import { readAll, linked, round, num } from './executiveCateringCommon.js';

// Supplier invoices still owed, from the supplier subledger: each posted
// invoice charge with a due date on or before upTo, less the payments and goods
// returned against that invoice, for the picked branches, oldest due first.
export async function supplierInvoicesDue(ctx, where, upTo) {
  const E = ctx.svc.entities;
  const charges = (await readAll(E.SupplierLedgerEntry, { ...where, kind: 'invoice', status: 'posted', due_date: { $lte: upTo } }))
    .filter((c, i, all) => c.due_date && c.invoice_id && all.findIndex((x) => x.invoice_id === c.invoice_id) === i);
  if (!charges.length) return [];
  const ids = charges.map((c) => c.invoice_id), left = new Map(), batches = [];
  for (let i = 0; i < ids.length; i += 100) {
    batches.push(E.SupplierLedgerEntry.aggregate({ query: { invoice_id: { $in: ids.slice(i, i + 100) }, status: 'posted' }, groupBy: 'invoice_id', sum: ['delta'], limit: 200 }));
  }
  for (const r of await Promise.all(batches)) for (const x of r.rows || []) left.set(x.invoice_id, round(num(x.sum_delta) ?? 0));
  const names = new Map((await linked(E.Supplier, 'id', charges.map((c) => c.supplier_id).filter(Boolean))).map((s) => [s.id, s.name]));
  return charges
    .map((c) => ({ id: c.invoice_id, invoice: c.invoice_number || '', supplier: names.get(c.supplier_id) || 'Unnamed supplier', due: c.due_date, outstanding: left.get(c.invoice_id) ?? 0 }))
    .filter((x) => x.outstanding > 0.005)
    .sort((a, b) => a.due.localeCompare(b.due));
}