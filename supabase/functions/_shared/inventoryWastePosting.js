import { requireValue, validateLines, moneyUnits } from './financeValidation.js';
import { withFinanceLock } from './financeAccess.js';
import { financeAuditClient } from './financeAuditClient.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { loadMappingBindings } from './financeBindingResolver.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { resolveStockBinding, describeMissingMapping, TASTING_HOLDING_KEY } from './inventoryMappingMessages.js';
import { settleTasting } from './inventoryTastingSettlement.js';

// Approved waste: debit the waste reason's account, credit the item's inventory account,
// once per declaration (posting_key). A food tasting linked to an event debits the tastings
// holding account instead and then follows the event outcome. Blocked postings become
// Finance posting issues.
const CONTROL = 'INVENTORY_CONTROL_ACCOUNT';
const wasteKey = (company, waste) => `${company.id}:inventory:waste:${waste.id}`;

export function wasteContext(base44, user) {
  const ctx = { base44, user, admin: user.role === 'admin', permissions: {}, auditRequestId: crypto.randomUUID() };
  ctx.svc = financeAuditClient(ctx);
  return ctx;
}

async function postJournal(ctx, company, waste, reason, key, tasting) {
  const db = ctx.svc.entities;
  const scale = 10 ** company.currency_decimals;
  const amount = moneyUnits(Math.round(Number(waste.cost_impact) * scale) / scale, company.currency_decimals) / scale;
  const date = String(waste.waste_date || waste.created_date || '').slice(0, 10);
  openFinanceDate(company, date);
  const item = await db.InventoryItem.get(waste.inventory_item_id).catch(() => null);
  const category = waste.category_id || item?.category_id;
  requireValue(category, 'The wasted item has no inventory category.');
  const bindings = await loadMappingBindings(ctx, company, [{ account_key: CONTROL }, ...(tasting ? [{ account_key: TASTING_HOLDING_KEY }] : [])]);
  const sample = { date, dimensions: { branch_id: waste.branch_id, currency: company.currency } };
  const [typed] = await inventoryItemStages(db, bindings, [{ inventory_item_id: waste.inventory_item_id, category_id: category }], sample);
  const where = { category, branch_id: waste.branch_id };
  const binding = resolveStockBinding(bindings, CONTROL, { date, dimensions: { ...sample.dimensions, category, ...(typed.inventory_stage ? { inventory_stage: typed.inventory_stage } : {}) } }, where);
  const holding = tasting ? resolveStockBinding(bindings, TASTING_HOLDING_KEY, { date, dimensions: { ...sample.dimensions, category } }, where) : null;
  const common = { cost_center: waste.branch_id, channel: 'inventory', product_category: category, product_reference: waste.inventory_item_id };
  const lines = await checkedAccounts(ctx, company, [
    { ...common, account_id: holding ? holding.account_id : reason.account_id, debit: amount, credit: 0 },
    { ...common, account_id: binding.account_id, debit: 0, credit: amount },
  ], date);
  const totals = validateLines(lines, company.currency_decimals);
  const used = [{ key: CONTROL, binding_id: binding.id, binding_updated_date: binding.updated_date }, ...(holding ? [{ key: TASTING_HOLDING_KEY, binding_id: holding.id, binding_updated_date: holding.updated_date }] : [])];
  const journal = await db.FinanceJournal.create({
    company_id: company.id, branch_id: waste.branch_id, posting_key: key, proposal_id: `waste:${waste.id}`, status: 'posted', entry_date: date,
    description: `${tasting ? 'Food tasting held for event' : 'Approved waste'} · ${waste.inventory_item_name || waste.inventory_item_id} · ${waste.waste_reason_name || waste.reason}`,
    kind: 'automatic', currency: company.currency, business_edition: company.edition, source_entity: 'WasteDeclaration', source_id: waste.id, source_version: waste.updated_date,
    source_summary: { quantity: waste.quantity_wasted, unit: waste.unit, cost_impact: waste.cost_impact, waste_reason_id: reason.id, tasting, mapping_bindings: used },
    lines, ...totals, prepared_by: 'Waste posting engine', prepared_by_id: 'system', reviewed_by: waste.approved_by || 'Waste approval', reviewed_by_id: 'system',
    reviewed_at: new Date().toISOString(), review_note: tasting ? 'Approved tasting at its recorded cost, held until the event outcome.' : 'Approved waste declaration at its recorded cost.', rule_version: 'waste-v1',
    evidence_note: 'Approved waste declaration, configured waste reason account and dated inventory mapping.', is_test: !!company.is_test, ledger_ready: false,
  });
  await projectFinanceJournal(ctx, company, journal);
  return journal;
}

// Posts one approved declaration (and settles a tasting) inside the company finance lock.
export async function postWasteLocked(ctx, company, waste) {
  const db = ctx.svc.entities, key = wasteKey(company, waste);
  requireValue(company.branch_ids?.includes(waste.branch_id), 'The waste branch does not belong to the waste reason company.');
  const reason = await db.FinanceWasteReason.get(waste.waste_reason_id).catch(() => null);
  requireValue(reason?.account_id, `Waste reason "${waste.waste_reason_name || waste.reason}" has no linked account.`);
  const tasting = reason.treatment === 'food_tasting' && !!waste.event_id;
  const prior = await db.FinanceJournal.filter({ company_id: company.id, posting_key: key, status: 'posted' }, { limit: 1 });
  const journal = prior.items[0] || await postJournal(ctx, company, waste, reason, key, tasting);
  const result = prior.items.length ? { already_posted: true, journal_id: journal.id } : { posted: true, journal_id: journal.id };
  if (tasting) result.settlement = await settleTasting(ctx, company, waste, reason, journal);
  await db.FinancePostingIssue.updateMany({ company_id: company.id, issue_key: key, status: 'open' }, { $set: { status: 'resolved', resolved_at: new Date().toISOString() } });
  return result;
}

export async function recordWasteIssue(db, company, waste, error) {
  await describeMissingMapping(db, error);
  await db.FinancePostingIssue.upsert([{
    issue_key: wasteKey(company, waste), company_id: company.id, branch_id: waste.branch_id, source_entity: 'WasteDeclaration', source_id: waste.id,
    source_description: `Approved waste · ${waste.inventory_item_name || waste.id}`, entry_date: String(waste.waste_date || '').slice(0, 10),
    status: 'open', message: error.message, last_attempt_at: new Date().toISOString(),
  }], { key: 'issue_key' });
}

export async function postWasteDeclaration(ctx, wasteId) {
  const db = ctx.svc.entities;
  const waste = await db.WasteDeclaration.get(wasteId).catch(() => null);
  if (!waste || waste.status !== 'approved') return { skipped: true, reason: 'Waste declaration is not approved.' };
  if (!(Number(waste.cost_impact) > 0)) return { skipped: true, reason: 'No cost recorded on this waste.' };
  if (!waste.waste_reason_id) return { skipped: true, reason: 'Older declaration without a configured waste reason.' };
  const reason = await db.FinanceWasteReason.get(waste.waste_reason_id).catch(() => null);
  const company = reason && await db.FinanceCompany.get(reason.company_id).catch(() => null);
  if (!company || company.is_active === false) return { skipped: true, reason: 'No active finance company for this waste reason.' };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await withFinanceLock(ctx, company, (fresh) => postWasteLocked(ctx, fresh, waste));
    } catch (error) {
      if (![400, 409].includes(error.status)) throw error;
      lastError = error;
      if (error.status !== 409 || !/in progress/i.test(error.message)) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await recordWasteIssue(db, company, waste, lastError);
  return { blocked: true, message: lastError.message };
}

// Event closed, cancelled or reinstated: move its tastings to match the outcome.
export async function settleEventTastings(ctx, company, event) {
  const db = ctx.svc.entities, results = [];
  const page = await db.WasteDeclaration.filter({ event_id: event.id, status: 'approved' }, { limit: 200 });
  for (const waste of page.items) {
    if (!waste.waste_reason_id || !(Number(waste.cost_impact) > 0)) continue;
    const reason = await db.FinanceWasteReason.get(waste.waste_reason_id).catch(() => null);
    if (reason?.treatment !== 'food_tasting' || reason.company_id !== company.id) continue;
    try { results.push({ waste_id: waste.id, ...(await postWasteLocked(ctx, company, waste)) }); }
    catch (error) {
      if (![400, 409].includes(error.status)) throw error;
      await recordWasteIssue(db, company, waste, error);
      results.push({ waste_id: waste.id, blocked: true, message: error.message });
    }
  }
  return results;
}