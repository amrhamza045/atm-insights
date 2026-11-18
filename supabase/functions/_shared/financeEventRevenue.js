import { requireValue, validateLines, moneyUnits } from './financeValidation.js';
import { financeBranch, withFinanceLock } from './financeAccess.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { loadMappingBindings, resolveMappingLines } from './financeBindingResolver.js';
import { projectFinanceJournal } from './financeLedger.js';
import { inventoryDate } from './inventoryAccountingContext.js';
import { CUSTOMER_KEYS, accountIdsFor, eventLineDims, eventCustomerBalances, settleEventSafely } from './financeEventReceivable.js';
import { revenueSnapshot } from './financeRevenueSnapshot.js';

// B06. A finalized reconciliation is the event's final invoice. Its revenue posts once,
// on the finalization day (the same day its cost of sales posts), from posted ledger
// facts: customer advances already held for the event are applied first, and anything
// the client still owes becomes a receivable. Tax is never inferred.
export { revenueSnapshot };
export const revenueKey = (company, recon) => `${company.id}:event-revenue:${recon.id}`;

export async function eventRevenuePlan(ctx, company, recon) {
  const db = ctx.svc.entities;
  if (recon.status !== 'finalized') return null;
  const bindings = await loadMappingBindings(ctx, company, ['EVENT_REVENUE_ACC', ...CUSTOMER_KEYS].map((account_key) => ({ account_key })));
  if (!bindings.some((b) => b.mapping_key === 'EVENT_REVENUE_ACC')) return null; // company has not adopted event revenue routing
  financeBranch(ctx, company, recon.branch_id);
  const key = revenueKey(company, recon);
  const prior = await db.FinanceJournal.filter({ company_id: company.id, posting_key: key }, { limit: 2 });
  if (prior.items.length) {
    requireValue(JSON.stringify(prior.items[0].source_summary?.source_snapshot) === JSON.stringify(revenueSnapshot(recon)), 'The final invoice changed after its revenue was posted. Post a reviewed correction; never a second invoice.', 409);
    return { already_posted: true, journal: prior.items[0], key };
  }
  requireValue(company.currency === 'EGP', 'Catering invoices are in EGP. Another company currency needs a verified conversion first.');
  const event = await db.CateringEvent.get(recon.event_id);
  requireValue(event.branch_id === recon.branch_id, 'The reconciliation and its event are on different branches.');
  const scale = 10 ** company.currency_decimals, totalU = moneyUnits(Number(recon.final_billing_total) || 0, company.currency_decimals);
  requireValue(totalU > 0, 'The final invoice total must be above zero before revenue can post.');
  const quoteId = recon.quote_id || event.active_quote_id, quote = quoteId ? await db.CateringQuote.get(quoteId).catch(() => null) : null;
  requireValue(!(Number(quote?.tax_total) > 0 || Number(quote?.service_charge_total) > 0), 'This invoice includes VAT or a service charge. Map the tax accounts before its revenue can post; tax is never inferred.');
  const date = await inventoryDate(db, recon.finalized_date);
  openFinanceDate(company, date);

  const clientId = recon.client_id || event.client_id || '';
  const held = await eventCustomerBalances(ctx, company, event.id, { advance: accountIdsFor(bindings, 'CUSTOMER_ADVANCE_ACC'), receivable: accountIdsFor(bindings, 'CUSTOMER_RECEIVABLE_ACC') });
  const appliedU = Math.min(Math.max(held.advance, 0), totalU), owedU = totalU - appliedU;
  requireValue(!owedU || accountIdsFor(bindings, 'CUSTOMER_RECEIVABLE_ACC').length, `The client still owes ${owedU / scale} on this event. Map CUSTOMER_RECEIVABLE_ACC (accounts receivable) in Finance › Mapping Accounts so the unpaid balance is recorded.`);
  const sample = { date, dimensions: { branch_id: recon.branch_id, event_id: event.id, customer_id: clientId, currency: company.currency, channel: 'catering' } };
  const wanted = [appliedU && { account_key: 'CUSTOMER_ADVANCE_ACC', debit: appliedU }, owedU && { account_key: 'CUSTOMER_RECEIVABLE_ACC', debit: owedU }, { account_key: 'EVENT_REVENUE_ACC', credit: totalU }].filter(Boolean);
  const resolved = await resolveMappingLines(ctx, company, wanted.map(({ account_key }) => ({ account_key })), sample, bindings);
  const dims = eventLineDims(event, clientId);
  const lines = await checkedAccounts(ctx, company, resolved.map((l, i) => ({ account_id: l.account_id, debit: (wanted[i].debit || 0) / scale, credit: (wanted[i].credit || 0) / scale, ...dims })), date);
  const kind = { CUSTOMER_ADVANCE_ACC: ['2', 'a liability'], CUSTOMER_RECEIVABLE_ACC: ['1', 'an asset'], EVENT_REVENUE_ACC: ['4', 'a revenue'] };
  lines.forEach((l, i) => { const [prefix, label] = kind[wanted[i].account_key]; requireValue(l.account_code.startsWith(prefix), `${wanted[i].account_key} must be ${label} account (account ${l.account_code}).`); });
  return {
    key, date, event, lines, ...validateLines(lines, company.currency_decimals),
    applied_advance: appliedU / scale, receivable: owedU / scale,
    source_summary: { source_snapshot: revenueSnapshot(recon), mapping_event: 'B06', event_id: event.id, client_id: clientId, ledger_advance_before: held.advance / scale, ledger_receivable_before: held.receivable / scale, applied_advance: appliedU / scale, receivable: owedU / scale, mapping_bindings: resolved.map((l) => ({ key: l.account_key, binding_id: l.binding_id, binding_updated_date: l.binding_updated_date })), sample },
  };
}

export async function postEventRevenue(ctx, company, recon, { dryRun = false } = {}) {
  const db = ctx.svc.entities, key = revenueKey(company, recon);
  try {
    const plan = await eventRevenuePlan(ctx, company, recon);
    if (!plan) return { skipped: true, reason: recon.status !== 'finalized' ? 'The reconciliation is not finalized.' : 'Event revenue routing is not configured for this company.' };
    if (plan.already_posted) { if (!dryRun) await projectFinanceJournal(ctx, company, plan.journal); return { already_posted: true, journal_id: plan.journal.id }; }
    if (dryRun) return { preview: true, entry_date: plan.date, lines: plan.lines, total_debit: plan.total_debit, total_credit: plan.total_credit, applied_advance: plan.applied_advance, receivable: plan.receivable };
    const journal = await db.FinanceJournal.create({
      company_id: company.id, branch_id: recon.branch_id, proposal_id: `event-revenue:${recon.id}`, posting_key: key, status: 'posted', entry_date: plan.date,
      description: `Event invoice · ${recon.event_name || plan.event.event_name || recon.event_id}`, kind: 'automatic', currency: company.currency, business_edition: company.edition,
      source_id: recon.id, source_entity: 'CateringReconciliation', source_version: recon.updated_date || '', source_summary: plan.source_summary,
      lines: plan.lines, total_debit: plan.total_debit, total_credit: plan.total_credit,
      prepared_by: 'Configured event revenue mapping', prepared_by_id: 'system', reviewed_by: 'Validated semantic account routing', reviewed_by_id: 'system', reviewed_at: new Date().toISOString(),
      review_note: 'Finalized reconciliation recognized as the event’s final invoice with complete, dated, unambiguous revenue and customer-account mappings.', rule_version: 'mapped-event-revenue-v1',
      evidence_note: `Final invoice ${plan.total_credit}: ${plan.applied_advance} applied from customer advances held in the ledger, ${plan.receivable} receivable. No tax lines inferred.`, is_test: !!company.is_test, ledger_ready: false,
    });
    await projectFinanceJournal(ctx, company, journal);
    await db.FinancePostingIssue.updateMany({ company_id: company.id, issue_key: key, status: 'open' }, { $set: { status: 'resolved', resolved_at: new Date().toISOString() } });
    const settled = await settleEventSafely(ctx, company, plan.event.id, journal);
    return { posted: true, journal_id: journal.id, applied_advance: plan.applied_advance, receivable: plan.receivable, settlement: settled };
  } catch (error) {
    if (![400, 404, 409].includes(error.status)) throw error;
    if (!dryRun) await db.FinancePostingIssue.upsert([{ issue_key: key, company_id: company.id, branch_id: recon.branch_id, source_entity: 'CateringReconciliation', source_id: recon.id, source_description: `Event invoice · ${recon.event_name || recon.event_id}`, entry_date: String(recon.finalized_date || '').slice(0, 10), status: 'open', message: error.message, last_attempt_at: new Date().toISOString(), resolved_at: '' }], { key: 'issue_key' });
    return { blocked: true, message: error.message, retry: /in progress/i.test(error.message) };
  }
}

// Workflow / catch-up entry: one finance company must own the reconciliation's branch.
export async function runRevenueJob(ctx, input) {
  const db = ctx.svc.entities;
  const recon = await db.CateringReconciliation.get(input.source_id);
  const owners = await db.FinanceCompany.filter({ is_active: { $ne: false }, branch_ids: recon.branch_id }, { limit: 5 });
  requireValue(owners.items.length <= 1, 'This branch belongs to more than one finance company. Resolve company ownership before posting.', 409);
  if (!owners.items.length) return { skipped: true, reason: 'No finance company owns this branch.' };
  try {
    return await withFinanceLock(ctx, owners.items[0], (fresh) => postEventRevenue(ctx, fresh, recon, { dryRun: input.dry_run === true }));
  } catch (error) {
    if (error.status !== 409) throw error;
    return { blocked: true, retry: true, message: error.message };
  }
}