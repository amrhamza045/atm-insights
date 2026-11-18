import { requireValue, validateLines } from './financeValidation.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { loadMappingBindings, resolveAccountBinding } from './financeBindingResolver.js';
import { paymentMethodAccount } from './financePaymentMethodRules.js';
import { projectFinanceJournal } from './financeLedger.js';
import { supplierEntries } from './supplierAccountsAccess.js';
export async function supplierJournalPlan(ctx, input, delta, opening = false) {
  const c = ctx.company, date = input.entry_date;
  openFinanceDate(c, date);
  const bindings = await loadMappingBindings(ctx, c, [{account_key: 'VENDOR_AP_ACCOUNT'}]);
  const sample = {date, dimensions: {branch_id: ctx.branch, currency: c.currency, supplier_id: ctx.supplier.id, payment_method: input.payment_method || '', original_tx_id: input.invoice_id || ''}};
  const payable = resolveAccountBinding(bindings, 'VENDOR_AP_ACCOUNT', sample);
  let other, method = null;
  if (opening) {
    other = await ctx.svc.entities.FinanceAccount.get(input.offset_account_id);
    requireValue(other.company_id === c.id && other.classification === 'equity', 'Choose an equity opening-balance offset account in this company.');
  } else {
    const p = await ctx.svc.entities.FinancePaymentMethod.filter({company_id: c.id, code: input.payment_method, is_active: true}, {limit: 2});
    requireValue(p.items.length === 1 && !p.has_more, 'Choose an active configured payment method.');
    method = p.items[0]; other = await ctx.svc.entities.FinanceAccount.get(method.account_id); paymentMethodAccount(c, other);
  }
  const amount = Math.abs(delta), increase = delta > 0;
  const raw = [{account_id: payable.account_id, debit: increase ? 0 : amount, credit: increase ? amount : 0}, {account_id: other.id, debit: increase ? amount : 0, credit: increase ? 0 : amount}].map(l => ({...l, cost_center: ctx.branch, channel: 'purchasing', product_reference: input.invoice_id || '', counterparty_reference: ctx.supplier.id}));
  const lines = await checkedAccounts(ctx, c, raw, date);
  requireValue(lines[0].account_code.startsWith('2'), 'Supplier payables must use a liability account.');
  return {lines, ...validateLines(lines, c.currency_decimals), method_id: method?.id || '', method_code: method?.code || '', method_name: method?.name || ''};
}
export async function finishSupplierJournal(ctx, entry) {
  const c = ctx.company, key = entry.kind === 'supplier_return' ? `${c.id}:supplier-return:${entry.id}` : `${c.id}:supplier:${entry.entry_key}`;
  const page = await ctx.svc.entities.FinanceJournal.filter({company_id: c.id, posting_key: key}, {limit: 2});
  requireValue(page.items.length <= 1 && !page.has_more, 'Duplicate supplier journals require review.', 409);
  let journal = page.items[0];
  if (!journal) {
    openFinanceDate(c, entry.entry_date);
    const plan = entry.account_snapshot;
    const lines = await checkedAccounts(ctx, c, plan.lines, entry.entry_date);
    requireValue(JSON.stringify(lines) === JSON.stringify(plan.lines), 'Account definitions changed; review the pending supplier operation.', 409);
    journal = await ctx.svc.entities.FinanceJournal.create({company_id: c.id, branch_id: ctx.branch, posting_key: key, proposal_id: `supplier:${entry.id}`, source_entity: 'SupplierLedgerEntry', source_id: entry.id, source_version: entry.updated_date, source_summary: {invoice_id: entry.invoice_id || '', supplier_id: ctx.supplier.id, payment_method_id: entry.payment_method_id || '', payment_method: entry.payment_method || '', ...(entry.kind === 'supplier_return' ? {return_snapshot: entry.account_snapshot, mapping_bindings: entry.account_snapshot.mapping_bindings} : {})}, status: 'posted', kind: entry.kind === 'opening' ? 'opening' : 'automatic', entry_date: entry.entry_date, description: `${entry.kind === 'opening' ? 'Opening balance' : entry.kind === 'supplier_return' ? 'Supplier goods return' : 'Supplier payment'}: ${ctx.supplier.name} ${entry.invoice_number || ''}`, currency: c.currency, business_edition: c.edition, lines, ...validateLines(lines, c.currency_decimals), prepared_by: ctx.user.email, prepared_by_id: ctx.user.id, reviewed_by: ctx.user.email, reviewed_by_id: ctx.user.id, reviewed_at: new Date().toISOString(), review_note: 'Explicit authorized supplier-account action using configured payable and payment accounts.', evidence_note: entry.notes, rule_version: 'supplier-accounts-v1', is_test: !!c.is_test, ledger_ready: false});
  }
  await projectFinanceJournal(ctx, c, journal);
  return supplierEntries(ctx).update(entry.id, {status: 'posted', journal_id: journal.id});
}