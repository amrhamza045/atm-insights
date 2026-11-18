import { supplierContext, withSupplierLock, supplierEntry, supplierPendingGuard } from './supplierAccountsAccess.js';
import { registerSupplierInvoice } from './supplierAccountReview.js';
import { paySupplier } from './supplierAccountMutations.js';
import { supplierJournalPlan } from './supplierAccountJournal.js';
import { supplierAmount, supplierSettlement, supplierOpeningAllowed, supplierInvoiceTotal } from './supplierAmounts.js';
import { runModuleJob } from './financeModuleJob.js';
import { requireValue, validDate } from './financeValidation.js';
export async function postInvoiceWithSupplierAccount(base44, user, body, postStock) {
  const invoice = await base44.entities.PurchaseInvoice.get(body.post_invoice_id);
  const ctx = await supplierContext(base44, user, {action: 'post', branch_id: invoice.branch_id, supplier_id: invoice.supplier_id}, true);
  return withSupplierLock(ctx, async () => {
    supplierInvoiceTotal(invoice);
    const settlement = body.settlement || {mode: 'credit', amount: 0};
    requireValue(['credit','full','partial'].includes(settlement.mode), 'Choose full, partial or deferred payment.');
    const amount = settlement.mode === 'full' ? supplierAmount(invoice.total_amount, true) : supplierAmount(settlement.amount || 0);
    requireValue(settlement.mode !== 'credit' || amount === 0, 'Deferred credit must not include a payment.');
    requireValue(settlement.mode !== 'partial' || amount > 0 && amount < supplierAmount(invoice.total_amount), 'A partial payment must be greater than zero and less than the invoice total.');
    supplierSettlement(invoice.total_amount, amount);
    requireValue(!settlement.due_date || validDate(settlement.due_date) && settlement.due_date >= invoice.invoice_date, 'Choose a due date on or after the invoice date.');
    const payment = {...settlement, action: 'pay', invoice_id: invoice.id, entry_date: settlement.entry_date || invoice.invoice_date, amount, notes: String(settlement.notes || `Initial payment for invoice ${invoice.invoice_number}`)};
    if (amount) {
      requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.request_key || ''), 'A payment submission identifier is required.');
      requireValue(validDate(payment.entry_date) && payment.entry_date >= invoice.invoice_date, 'Payment date cannot precede the invoice.');
      requireValue(payment.notes.trim().length >= 5 && payment.notes.length <= 1000, 'Enter a payment reference (5–1000 characters).');
      await supplierJournalPlan(ctx, payment, -amount);
    }
    await supplierPendingGuard(ctx, amount ? [`payment:${payment.request_key}`] : []);
    let charge = await supplierEntry(ctx, `invoice:${invoice.id}`), result = {success: true, invoice_id: invoice.id, status: 'posted', updated_items: [], already_posted: true};
    if (!charge) {
      requireValue(invoice.status === 'draft', 'This existing invoice must be reviewed in Supplier accounts before recording payments.', 409);
      const opening = (await ctx.svc.entities.SupplierLedgerEntry.filter({...ctx.query, kind: 'opening', status: 'posted'}, {limit: 1})).items[0];
      requireValue(supplierOpeningAllowed(opening?.entry_date, invoice.invoice_date), 'The invoice date is covered by the opening balance. Correct its date before posting.');
      const response = await postStock();
      if (!response.ok) return response;
      result = await response.json();
      charge = await registerSupplierInvoice(ctx, {...invoice, status: 'posted'}, {due_date: settlement.due_date});
    }
    let invoiceJournalId = charge?.journal_id || '';
    if (!invoiceJournalId) {
      const glResult = await runModuleJob({...ctx, admin: true, permissions: {}}, {
        source_entity: 'PurchaseInvoice',
        source_id: invoice.id,
        company_id: ctx.company.id,
      });
      if (glResult?.journal_id) {
        invoiceJournalId = glResult.journal_id;
        if (charge?.id) await ctx.svc.entities.SupplierLedgerEntry.update(charge.id, {journal_id: invoiceJournalId});
      }
    }
    if (amount) await paySupplier(ctx, payment);
    return Response.json({...result, supplier_account_updated: true, invoice_journal_id: invoiceJournalId, initial_payment: amount});
  });
}