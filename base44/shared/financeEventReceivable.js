import { requireValue, validateLines, moneyUnits } from './financeValidation.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { loadMappingBindings, resolveMappingLines } from './financeBindingResolver.js';
import { projectFinanceJournal } from './financeLedger.js';

export const CUSTOMER_KEYS = ['CUSTOMER_ADVANCE_ACC', 'CUSTOMER_RECEIVABLE_ACC'];
export const accountIdsFor = (bindings, key) => [...new Set(bindings.filter((b) => b.mapping_key === key).map((b) => b.account_id))];
export const eventLineDims = (event, clientId) => ({ cost_center: event.id, channel: 'catering', product_reference: event.id, counterparty_reference: clientId || event.client_id || '' });

// What one event holds in the customer accounts of the ledger, in money units:
// advance = credit − debit on customer-advance accounts, receivable = debit − credit.
export async function eventCustomerBalances(ctx, company, eventId, { advance = [], receivable = [] }) {
  const page = await ctx.svc.entities.FinanceJournal.filter({ company_id: company.id, status: 'posted', 'lines.cost_center': eventId }, { limit: 500 });
  requireValue(!page.has_more, 'Too many journals on one event to total safely.');
  const adv = new Set(advance), ar = new Set(receivable), units = (v) => moneyUnits(v || 0, company.currency_decimals);
  let a = 0, r = 0;
  for (const j of page.items) for (const l of j.lines || []) {
    if (l.cost_center !== eventId) continue;
    if (adv.has(l.account_id)) a += units(l.credit) - units(l.debit);
    if (ar.has(l.account_id)) r += units(l.debit) - units(l.credit);
  }
  return { advance: a, receivable: r };
}

// B17. Once an event is invoiced its customer position sits in one place: money still
// held as an advance pays the receivable, and an advance pushed below zero (a refund
// after invoicing) becomes a receivable. Never a debit balance inside customer advances.
export async function settleEventReceivable(ctx, company, event, trigger) {
  const db = ctx.svc.entities;
  const invoiced = await db.FinanceJournal.filter({ company_id: company.id, status: 'posted', source_entity: 'CateringReconciliation', 'lines.cost_center': event.id }, { limit: 2 });
  if (!invoiced.items.length) return null; // before the final invoice, receipts stay advances
  const key = `${company.id}:event-settle:${event.id}:${trigger.id}`;
  if (await db.FinanceJournal.count({ company_id: company.id, posting_key: key })) return { already_posted: true };
  const bindings = await loadMappingBindings(ctx, company, CUSTOMER_KEYS.map((account_key) => ({ account_key })));
  const bal = await eventCustomerBalances(ctx, company, event.id, { advance: accountIdsFor(bindings, 'CUSTOMER_ADVANCE_ACC'), receivable: accountIdsFor(bindings, 'CUSTOMER_RECEIVABLE_ACC') });
  const apply = bal.advance > 0 && bal.receivable > 0, move = apply ? Math.min(bal.advance, bal.receivable) : bal.advance < 0 ? -bal.advance : 0;
  if (!move) return null;
  requireValue(accountIdsFor(bindings, 'CUSTOMER_RECEIVABLE_ACC').length, 'Map CUSTOMER_RECEIVABLE_ACC (accounts receivable) in Finance › Mapping Accounts so this event’s customer balance can be settled.');
  const date = [invoiced.items[0].entry_date, trigger.entry_date].filter(Boolean).sort().pop();
  openFinanceDate(company, date);
  const sample = { date, dimensions: { branch_id: event.branch_id, event_id: event.id, customer_id: event.client_id || '', currency: company.currency, channel: 'catering' } };
  const [adv, ar] = await resolveMappingLines(ctx, company, CUSTOMER_KEYS.map((account_key) => ({ account_key })), sample, bindings);
  const amount = move / 10 ** company.currency_decimals, dims = eventLineDims(event);
  const [dr, cr] = apply ? [adv, ar] : [ar, adv];
  const lines = await checkedAccounts(ctx, company, [{ account_id: dr.account_id, debit: amount, credit: 0, ...dims }, { account_id: cr.account_id, debit: 0, credit: amount, ...dims }], date);
  const description = `${apply ? 'Receipt applied to event invoice' : 'Refund after invoice moved to receivable'} · ${event.event_name || event.id}`;
  const journal = await db.FinanceJournal.create({
    company_id: company.id, branch_id: event.branch_id, proposal_id: `event-settle:${event.id}:${trigger.id}`, posting_key: key, status: 'posted', entry_date: date, description,
    kind: 'automatic', currency: company.currency, business_edition: company.edition, source_id: event.id, source_entity: 'CateringEvent', source_version: event.updated_date || '',
    source_summary: { mapping_event: 'B17', trigger_journal_id: trigger.id, advance_before: bal.advance / 10 ** company.currency_decimals, receivable_before: bal.receivable / 10 ** company.currency_decimals, mapping_bindings: [dr, cr].map((l) => ({ key: l.account_key, binding_id: l.binding_id, binding_updated_date: l.binding_updated_date })) },
    lines, ...validateLines(lines, company.currency_decimals), prepared_by: 'Configured event receivable mapping', prepared_by_id: 'system', reviewed_by: 'Validated semantic account routing', reviewed_by_id: 'system', reviewed_at: new Date().toISOString(),
    review_note: 'Customer advances and receivables for an invoiced event are netted from posted ledger lines only.', rule_version: 'mapped-event-receivable-v1',
    evidence_note: `Event ledger before settlement: advance ${bal.advance / 10 ** company.currency_decimals}, receivable ${bal.receivable / 10 ** company.currency_decimals}.`, is_test: !!company.is_test, ledger_ready: false,
  });
  await projectFinanceJournal(ctx, company, journal);
  return { posted: true, journal_id: journal.id };
}

// Settlement never blocks the receipt that triggered it: a gap opens its own Posting Issue.
export async function settleEventSafely(ctx, company, eventId, trigger) {
  const db = ctx.svc.entities, issue_key = `${company.id}:event-settle:${eventId}`;
  try {
    const event = await db.CateringEvent.get(eventId);
    const result = await settleEventReceivable(ctx, company, event, trigger);
    await db.FinancePostingIssue.updateMany({ company_id: company.id, issue_key, status: 'open' }, { $set: { status: 'resolved', resolved_at: new Date().toISOString() } });
    return result;
  } catch (error) {
    if (![400, 404, 409].includes(error.status)) throw error;
    await db.FinancePostingIssue.upsert([{ issue_key, company_id: company.id, branch_id: trigger.branch_id || '', source_entity: 'CateringEvent', source_id: eventId, source_description: 'Event customer balance settlement', entry_date: trigger.entry_date || '', status: 'open', message: error.message, last_attempt_at: new Date().toISOString(), resolved_at: '' }], { key: 'issue_key' });
    return { blocked: true, message: error.message };
  }
}