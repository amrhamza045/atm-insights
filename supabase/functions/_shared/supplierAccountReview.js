import { requireValue, validDate } from './financeValidation.js';
import { supplierAmount, supplierSettlement, supplierOpeningAllowed, supplierInvoiceTotal } from './supplierAmounts.js';
import { supplierEntries, supplierEntry, supplierPendingGuard } from './supplierAccountsAccess.js';
import { audit } from './auditLog.js';
export const supplierBase = (ctx, data) => ({...ctx.query, currency: ctx.company.currency, actor_email: ctx.user.email, invoice_id: '', invoice_number: '', journal_id: '', notes: '', ...data});
export async function supplierInvoice(ctx, id) {
  requireValue(typeof id === 'string' && id, 'Choose an invoice.');
  const i = await ctx.svc.entities.PurchaseInvoice.get(id);
  requireValue(i.branch_id === ctx.branch && i.supplier_id === ctx.supplier.id, 'Invoice does not belong to this supplier and branch.', 403);
  return i;
}
export async function registerSupplierInvoice(ctx, invoice, input = {}) {
  requireValue(invoice.status !== 'draft', 'Draft invoices do not create a payable.');
  requireValue(validDate(invoice.invoice_date), 'The invoice needs a valid date.');
  const amount = supplierInvoiceTotal(invoice), paid = supplierAmount(input.paid || 0);
  supplierSettlement(amount, paid);
  requireValue(!input.due_date || validDate(input.due_date) && input.due_date >= invoice.invoice_date, 'Due date must not precede the invoice date.');
  const key = `invoice:${invoice.id}`, paidKey = `history:${invoice.id}`, e = supplierEntries(ctx);
  await supplierPendingGuard(ctx, [key, paidKey]);
  const opening = (await e.filter({...ctx.query, kind: 'opening', status: 'posted'}, {limit: 1})).items[0];
  requireValue(supplierOpeningAllowed(opening?.entry_date, invoice.invoice_date), 'This invoice is already covered by the opening balance cutoff; importing it would double-count the debt.');
  let prior = await supplierEntry(ctx, key);
  if (prior) {
    requireValue(prior.delta === amount && Number(prior.reviewed_paid || 0) === paid, 'This invoice was already registered with different amounts. Existing entries cannot be overwritten.', 409);
    if (prior.status === 'posted') return prior;
  }
  if (input.historical) requireValue(typeof input.notes === 'string' && input.notes.trim().length >= 5, 'Explain the historical payment evidence or confirm that the invoice is unpaid.');
  const notes = String(input.notes || 'New posted purchase invoice').trim().slice(0, 1000);
  prior ||= await e.create(supplierBase(ctx, {entry_key: key, kind: 'invoice', status: 'pending', invoice_id: invoice.id, invoice_number: invoice.invoice_number, entry_date: invoice.invoice_date, due_date: input.due_date || '', delta: amount, reviewed_paid: paid, source_version: invoice.updated_date, notes}));
  if (paid > 0 && !await supplierEntry(ctx, paidKey)) await e.create(supplierBase(ctx, {entry_key: paidKey, kind: 'historical_settlement', status: 'pending', invoice_id: invoice.id, invoice_number: invoice.invoice_number, entry_date: invoice.invoice_date, delta: -paid, notes: `Historical paid amount, no new cash movement: ${notes}`}));
  await e.updateMany({...ctx.query, entry_key: {$in: [key, paidKey]}, status: 'pending'}, {$set: {status: 'posted'}});
  await audit(ctx.base44, ctx.user, 'create', 'SupplierLedgerEntry', `Registered invoice ${invoice.invoice_number} in supplier account`, {entityId: prior.id, changes: {invoice_id: invoice.id, invoiced: amount, historical_paid: paid, branch_id: ctx.branch}});
  return {...prior, status: 'posted'};
}