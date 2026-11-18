import { requireValue, validDate } from './financeValidation.js';
import { withFinanceLock } from './financeAccess.js';
import { supplierAmount } from './supplierAmounts.js';
import { supplierBalance, supplierEntries, supplierEntry, supplierPendingGuard } from './supplierAccountsAccess.js';
import { supplierBase, supplierInvoice } from './supplierAccountReview.js';
import { supplierJournalPlan, finishSupplierJournal } from './supplierAccountJournal.js';
import { audit } from './auditLog.js';
const dateAndNote = input => { requireValue(validDate(input.entry_date), 'Choose a valid accounting date.'); requireValue(typeof input.notes === 'string' && input.notes.trim().length >= 5 && input.notes.length <= 1000, 'Enter a reference or explanation (5–1000 characters).'); };
export async function paySupplier(ctx, input) {
  const amount = supplierAmount(input.amount, true); dateAndNote(input);
  requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.request_key || ''), 'A valid payment submission identifier is required.');
  const key = `payment:${input.request_key}`; await supplierPendingGuard(ctx, [key]);
  let entry = await supplierEntry(ctx, key);
  if (entry) {
    requireValue(entry.delta === -amount && entry.entry_date === input.entry_date && entry.invoice_id === (input.invoice_id || '') && entry.payment_method === input.payment_method && entry.notes === input.notes.trim(), 'This payment identifier was already used with different details.', 409);
    if (entry.status === 'posted') return {entry, already_recorded: true};
  }
  let invoice = null;
  if (input.invoice_id) {
    invoice = await supplierInvoice(ctx, input.invoice_id);
    requireValue(await supplierEntry(ctx, `invoice:${invoice.id}`), 'Review and register this historical invoice before paying it.');
    requireValue(input.entry_date >= invoice.invoice_date, 'Payment date cannot precede the invoice.');
  } else {
    const opening = (await supplierEntries(ctx).filter({...ctx.query, kind: 'opening', status: 'posted'}, {limit: 1})).items[0];
    requireValue(opening && input.entry_date >= opening.entry_date, 'Payment date cannot precede the opening balance.');
  }
  if (!entry) {
    const remaining = await supplierBalance(ctx, {invoice_id: invoice?.id || ''}), total = await supplierBalance(ctx);
    requireValue(amount <= remaining && amount <= total, 'Payment cannot exceed the verified outstanding balance.');
  }
  return withFinanceLock(ctx, ctx.company, async company => {
    const fresh = {...ctx, company};
    if (!entry) {
      const plan = await supplierJournalPlan(fresh, input, -amount);
      await ctx.svc.entities.FinancePaymentMethod.update(plan.method_id, {has_transactions: true});
      entry = await supplierEntries(ctx).create(supplierBase(ctx, {entry_key: key, kind: 'payment', status: 'pending', entry_date: input.entry_date, invoice_id: invoice?.id || '', invoice_number: invoice?.invoice_number || '', delta: -amount, payment_method_id: plan.method_id, payment_method: plan.method_code, payment_method_name: plan.method_name, account_snapshot: plan, notes: input.notes.trim()}));
    }
    const saved = await finishSupplierJournal(fresh, entry);
    await audit(ctx.base44, ctx.user, 'create', 'SupplierLedgerEntry', `Recorded supplier payment to ${ctx.supplier.name}`, {entityId: saved.id, changes: {amount, invoice_id: saved.invoice_id, journal_id: saved.journal_id, payment_method: saved.payment_method}});
    return {entry: saved};
  });
}
export async function openSupplierBalance(ctx, input) {
  dateAndNote(input); const amount = supplierAmount(input.amount), key = `opening:${ctx.company.id}:${ctx.branch}:${ctx.supplier.id}`;
  await supplierPendingGuard(ctx, [key]);
  let entry = await supplierEntry(ctx, key);
  if (entry) { requireValue(entry.delta === amount && entry.entry_date === input.entry_date && entry.notes === input.notes.trim() && !!entry.account_snapshot?.already_in_gl === !!input.already_in_gl, 'An opening balance already exists. Opening balances are not overwritten; use an evidenced accounting correction.', 409); if (entry.status === 'posted') return {entry, already_recorded: true}; }
  requireValue(input.confirmed === true, 'Confirm the cutoff and that this balance excludes separately imported invoices.');
  requireValue(!await supplierEntries(ctx).count({...ctx.query, kind: 'invoice', entry_date: {$lte: input.entry_date}}), 'Invoices on or before this date were already imported. Use an earlier opening date to avoid double-counting.');
  return withFinanceLock(ctx, ctx.company, async company => {
    const fresh = {...ctx, company};
    if (!entry) {
      const plan = amount > 0 && !input.already_in_gl ? await supplierJournalPlan(fresh, input, amount, true) : {};
      entry = await supplierEntries(ctx).create(supplierBase(ctx, {entry_key: key, kind: 'opening', status: 'pending', entry_date: input.entry_date, delta: amount, account_snapshot: {...plan, already_in_gl: input.already_in_gl === true, offset_account_id: input.offset_account_id || ''}, notes: input.notes.trim()}));
    }
    const saved = entry.account_snapshot?.lines ? await finishSupplierJournal(fresh, entry) : await supplierEntries(ctx).update(entry.id, {status: 'posted'});
    await audit(ctx.base44, ctx.user, 'create', 'SupplierLedgerEntry', `Entered supplier opening balance for ${ctx.supplier.name}`, {entityId: saved.id, changes: {amount, cutoff: saved.entry_date, journal_id: saved.journal_id}});
    return {entry: saved};
  });
}