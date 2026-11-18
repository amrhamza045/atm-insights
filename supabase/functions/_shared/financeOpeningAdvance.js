import { requireValue, moneyUnits } from './financeValidation.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { financePermission, financeBranch } from './financeAccess.js';
import { eventLineDims } from './financeEventReceivable.js';
import { loadEventMoney, round2 } from './cateringPaymentPosting.js';
import { eventFirstPayment } from './paymentPolicyRules.js';
import { OPENING_EQUITY_KEY, ADVANCE_KEY, chooseCutoff, alignOpeningEquity, findOpening, openingLines, postOpeningJournal } from './financeOpening.js';

// B02: a deposit the client paid before the cut-off for an event after it. Cr customer
// advances on the event (so its final invoice applies it like any deposit), Dr opening
// balance equity. It is also recorded on the event as a completed opening deposit so the
// balance due is right; that payment never posts on its own and cannot be voided.
export async function postOpeningAdvance(ctx, company, input) {
  financePermission(ctx, 'finance_journal_approve');
  const db = ctx.svc.entities, amount = Number(input.amount), notes = String(input.notes || '').trim();
  const event = input.event_id ? await db.CateringEvent.get(input.event_id).catch(() => null) : null;
  requireValue(event, 'Choose an event.');
  financeBranch(ctx, company, event.branch_id);
  requireValue(event.client_id, 'This event has no client. Link a client to the event first.');
  requireValue(!['cancelled', 'completed'].includes(event.status), 'Choose an event that is not cancelled or completed.');
  requireValue(moneyUnits(amount, company.currency_decimals) > 0, 'Enter the advance received above zero.');
  requireValue(notes.length >= 3 && notes.length <= 500, 'Add the evidence reference, such as the receipt or client ledger.');
  const { cutoff, first } = await chooseCutoff(ctx, company, input.cutoff_date);
  requireValue(String(event.event_date || '') > cutoff, `The event must take place after the cut-off (${cutoff}). Advances for earlier events belong to the old books.`);
  const entry_key = `advance:${company.id}:${event.id}`;
  let entry = await findOpening(db, company, entry_key, (e) => e.amount === amount && e.notes === notes);
  if (!entry) {
    const bindings = await alignOpeningEquity(ctx, company, cutoff, first);
    const sample = { date: cutoff, dimensions: { branch_id: event.branch_id, currency: company.currency } };
    const equity = resolveAccountBinding(bindings, OPENING_EQUITY_KEY, sample);
    const advance = resolveAccountBinding((await db.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: ADVANCE_KEY }, { limit: 50 })).items, ADVANCE_KEY, sample);
    const dims = eventLineDims(event, event.client_id);
    const raw = [{ ...dims, account_id: advance.account_id, debit: 0, credit: amount }, { ...dims, account_id: equity.account_id, debit: amount, credit: 0 }];
    const lines = await openingLines(ctx, company, raw, cutoff);
    requireValue(String(lines[0].account_code || '').startsWith('2'), 'Customer advances must map to a liability account.');
    entry = await db.FinanceOpeningBalance.create({
      entry_key, company_id: company.id, branch_id: event.branch_id, branch_name: event.branch_name || '', kind: 'customer_advance', status: 'pending', cutoff_date: cutoff, amount,
      event_id: event.id, event_name: event.event_name || '', event_date: event.event_date, client_id: event.client_id, client_name: event.client_name || '', notes, actor_email: ctx.user.email,
      account_snapshot: { raw, lines, mapping_bindings: [{ key: ADVANCE_KEY, binding_id: advance.id, binding_updated_date: advance.updated_date }, { key: OPENING_EQUITY_KEY, binding_id: equity.id, binding_updated_date: equity.updated_date }] },
    });
  }
  if (!entry.catering_payment_id) entry = await recordOpeningDeposit(ctx, entry, event);
  const saved = await postOpeningJournal(ctx, company, entry, `${entry.client_name || 'Client'} · ${entry.event_name || entry.event_id}`);
  return { entry: { ...saved, account_snapshot: undefined } };
}

// The advance on the event, so its paid total, deposit status and balance due include it.
// Found again by its request ID on a retry, so it is never recorded twice.
async function recordOpeningDeposit(ctx, entry, event) {
  const db = ctx.svc.entities, request = `opening:${entry.id}`;
  const found = await db.CateringPayment.filter({ event_id: event.id, client_request_id: request }, { limit: 2 });
  const payment = found.items[0] || await db.CateringPayment.create({
    branch_id: event.branch_id, branch_name: event.branch_name || '', event_id: event.id, event_name: event.event_name || '', quote_id: event.active_quote_id || '',
    client_id: event.client_id, client_name: event.client_name || '', payment_type: 'deposit', amount: entry.amount, payment_method: 'opening_balance', status: 'completed',
    payment_date: `${entry.cutoff_date}T00:00:00.000Z`, reference: entry.notes, opening_balance: true, client_request_id: request,
    recorded_by: ctx.user.email, recorded_by_id: ctx.user.id, approved_by: ctx.user.email, approved_date: new Date().toISOString(),
    notes: 'Advance paid before the opening cut-off, entered in Finance › Opening balances.',
  });
  const money = await loadEventMoney(ctx.svc, event);
  const required = event.payment_policy_id ? eventFirstPayment(event, Number(event.quote_total) || 0, money.grandTotal) : Number(event.required_deposit_amount) || 0;
  await db.CateringEvent.update(event.id, {
    total_paid: money.totalPaid, deposit_paid_amount: money.depositPaid, balance_due: round2(money.grandTotal - money.totalPaid),
    deposit_status: money.depositPaid <= 0 ? 'none' : required > 0 && money.depositPaid >= required ? 'paid' : 'partial',
  });
  return db.FinanceOpeningBalance.update(entry.id, { catering_payment_id: payment.id });
}