import { requireValue, moneyUnits, validateLines } from './financeValidation.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { paymentMethodAccount } from './financePaymentMethodRules.js';
import { financePermission, financeBranch } from './financeAccess.js';
import { OPENING_EQUITY_KEY, chooseCutoff, alignOpeningEquity, postOpeningJournal } from './financeOpening.js';

// B04: opening cash and bank, once per payment method and branch, at the company cut-off.
// Dr the payment method's cash/bank account, Cr opening balance equity. Never overwritten.
export async function postOpeningCash(ctx, company, input) {
  financePermission(ctx, 'finance_journal_approve');
  financeBranch(ctx, company, input.branch_id);
  const db = ctx.svc.entities, amount = Number(input.amount), notes = String(input.notes || '').trim();
  requireValue(moneyUnits(amount, company.currency_decimals) > 0, 'Enter an opening balance above zero.');
  requireValue(notes.length >= 3 && notes.length <= 500, 'Add the evidence reference, such as the bank statement or cash count.');
  const method = await db.FinancePaymentMethod.get(input.payment_method_id).catch(() => null);
  requireValue(method?.company_id === company.id && method.is_active, 'Choose an active payment method of this company.');
  const { cutoff, first } = await chooseCutoff(ctx, company, input.cutoff_date);
  const entry_key = `cash:${company.id}:${input.branch_id}:${method.id}`;
  const found = await db.FinanceOpeningBalance.filter({ company_id: company.id, entry_key }, { limit: 2 });
  requireValue(found.items.length <= 1, 'Duplicate opening entries require review.', 409);
  let entry = found.items[0];
  if (entry) {
    requireValue(entry.status === 'pending', 'This payment method already has an opening balance for this branch. Opening balances are never overwritten; correct it with a journal.', 409);
    requireValue(entry.amount === amount && entry.notes === notes, 'An unfinished opening entry with other values exists. Retry with the same amount and reference.', 409);
  } else {
    const bindings = await alignOpeningEquity(ctx, company, cutoff, first);
    const equity = resolveAccountBinding(bindings, OPENING_EQUITY_KEY, { date: cutoff, dimensions: { branch_id: input.branch_id, currency: company.currency, payment_method: method.code } });
    paymentMethodAccount(company, await db.FinanceAccount.get(method.account_id));
    const common = { cost_center: input.branch_id, channel: 'opening', counterparty_reference: method.code };
    const raw = [{ ...common, account_id: method.account_id, debit: amount, credit: 0 }, { ...common, account_id: equity.account_id, debit: 0, credit: amount }];
    openFinanceDate(company, cutoff);
    const lines = await checkedAccounts(ctx, company, raw, cutoff);
    requireValue(lines[1].management_mapping === 'equity', 'Opening balance equity must map to an equity account.');
    validateLines(lines, company.currency_decimals);
    const branch = await db.Branch.get(input.branch_id).catch(() => null);
    entry = await db.FinanceOpeningBalance.create({
      entry_key, company_id: company.id, branch_id: input.branch_id, branch_name: branch?.name || '', kind: 'cash', status: 'pending', cutoff_date: cutoff, amount,
      payment_method_id: method.id, payment_method_code: method.code, payment_method_name: method.name, notes, actor_email: ctx.user.email,
      account_snapshot: { raw, lines, mapping_bindings: [{ key: OPENING_EQUITY_KEY, binding_id: equity.id, binding_updated_date: equity.updated_date }] },
    });
  }
  const saved = await postOpeningJournal(ctx, company, entry, `${entry.payment_method_name} · ${entry.branch_name || entry.branch_id}`);
  return { entry: { ...saved, account_snapshot: undefined } };
}