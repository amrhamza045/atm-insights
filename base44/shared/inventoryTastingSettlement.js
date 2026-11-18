import { validateLines } from './financeValidation.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { loadMappingBindings } from './financeBindingResolver.js';
import { inventoryDate } from './inventoryAccountingContext.js';
import { resolveStockBinding } from './inventoryMappingMessages.js';

const COGS = 'INVENTORY_COGS_ACCOUNT';
const LABEL = { holding: 'back to tastings holding', cogs: 'to event COGS', marketing: 'to tasting expense' };
export const tastingOutcome = (event) => (!event || event.status === 'cancelled' ? 'marketing' : event.status === 'completed' ? 'cogs' : 'holding');

// A tasting linked to an event waits in the holding account until the outcome is known:
// closed → COGS (issue type "tasting"), cancelled → the tasting reason's account.
// Each outcome change posts one move from the current account to the new one, so a
// reinstated event simply moves the cost again. Runs inside the company finance lock.
export async function settleTasting(ctx, company, waste, reason, holding) {
  const db = ctx.svc.entities;
  const event = await db.CateringEvent.get(waste.event_id).catch(() => null);
  const target = tastingOutcome(event);
  const moves = (await db.FinanceJournal.filter({ company_id: company.id, source_entity: 'WasteDeclaration', source_id: waste.id, status: 'posted' }, { limit: 50 })).items
    .filter((j) => j.source_summary?.settlement).sort((a, b) => a.source_summary.sequence - b.source_summary.sequence);
  const last = moves.at(-1), current = last ? last.source_summary.outcome : 'holding';
  if (current === target) return { settled: target };

  const held = holding.lines.find((l) => l.debit > 0), holdingAccount = held.account_id, category = held.product_category || waste.category_id;
  const from = last ? last.source_summary.to_account_id : holdingAccount;
  const date = await inventoryDate(db);
  openFinanceDate(company, date);
  let to = target === 'holding' ? holdingAccount : reason.account_id, binding = null;
  if (target === 'cogs') {
    const bindings = await loadMappingBindings(ctx, company, [{ account_key: COGS }]);
    binding = resolveStockBinding(bindings, COGS, { date, dimensions: { branch_id: waste.branch_id, currency: company.currency, category, issue_type: 'tasting' } }, { category, branch_id: waste.branch_id, issue_type: 'tasting' });
    to = binding.account_id;
  }
  const amount = holding.total_debit, sequence = (last?.source_summary.sequence || 0) + 1;
  const common = { cost_center: waste.branch_id, channel: 'inventory', product_category: category, product_reference: waste.inventory_item_id };
  const lines = await checkedAccounts(ctx, company, [{ ...common, account_id: to, debit: amount, credit: 0 }, { ...common, account_id: from, debit: 0, credit: amount }], date);
  const totals = validateLines(lines, company.currency_decimals);
  const journal = await db.FinanceJournal.create({
    company_id: company.id, branch_id: waste.branch_id, posting_key: `${company.id}:inventory:tasting-settle:${waste.id}:${sequence}`, proposal_id: `tasting:${waste.id}:${sequence}`,
    status: 'posted', entry_date: date, description: `Food tasting moved ${LABEL[target]} · ${waste.inventory_item_name || waste.inventory_item_id} · ${event?.event_name || 'event removed'}`,
    kind: 'automatic', currency: company.currency, business_edition: company.edition, source_entity: 'WasteDeclaration', source_id: waste.id, source_version: waste.updated_date,
    source_summary: { settlement: true, sequence, outcome: target, from_account_id: from, to_account_id: to, event_id: waste.event_id, event_status: event?.status || 'removed', holding_journal_id: holding.id, ...(binding ? { mapping_bindings: [{ key: COGS, binding_id: binding.id, binding_updated_date: binding.updated_date }] } : {}) },
    lines, ...totals, prepared_by: 'Tasting settlement engine', prepared_by_id: 'system', reviewed_by: 'Event outcome', reviewed_by_id: 'system',
    reviewed_at: new Date().toISOString(), review_note: 'Tasting cost follows the linked event: closed to COGS, cancelled to the tasting reason account.', rule_version: 'tasting-settlement-v1',
    evidence_note: 'Approved tasting declaration, its holding journal and the event status.', is_test: !!company.is_test, ledger_ready: false,
  });
  await projectFinanceJournal(ctx, company, journal);
  return { posted: true, outcome: target, journal_id: journal.id };
}