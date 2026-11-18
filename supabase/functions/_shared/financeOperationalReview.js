// Prepares review-first journals from operational sources, validates them again on
// approval and applies the one physical effect (restocking a returned item) once.
import { requireValue, validateLines } from './financeValidation.js';
import { resolveMappingLines } from './financeBindingResolver.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { OPERATIONAL_ENTITIES, operationalEligible, operationalPlan } from './financeOperationalSources.js';

export const OPERATIONAL_RULE = 'operational-review-v1';
const sourceKey = (c, e, id) => `${c.id}:op:${e}:${id}`;
export const operationalIssueKey = (c, e, id) => `${c.id}:operational:${e}:${id}`;

async function setIssue(ctx, company, entity, s, date, message) {
  await ctx.svc.entities.FinancePostingIssue.upsert([{ issue_key: operationalIssueKey(company, entity, s.id), company_id: company.id, branch_id: s.branch_id, source_id: s.id, source_entity: entity, source_description: `${entity} · ${s.employee_name || s.item_name || s.description || s.id}`, entry_date: date || '', status: message ? 'open' : 'resolved', message: message || '', last_attempt_at: new Date().toISOString(), resolved_at: message ? '' : new Date().toISOString() }], { key: 'issue_key' });
}
async function resolveIssue(ctx, company, entity, s) {
  const open = await ctx.svc.entities.FinancePostingIssue.count({ issue_key: operationalIssueKey(company, entity, s.id), status: 'open' });
  if (open) await setIssue(ctx, company, entity, s, '', '');
}

export async function prepareOperational(ctx, company, entity, s) {
  requireValue(OPERATIONAL_ENTITIES.includes(entity), 'Unsupported operational source.');
  if (!s || !(company.branch_ids || []).includes(s.branch_id)) return { skipped: true, reason: 'Not in this company.' };
  if (!(await operationalEligible(ctx, entity, s))) return { skipped: true, reason: 'Not final yet.' };
  const key = sourceKey(company, entity, s.id);
  const prior = (await ctx.svc.entities.FinanceProposal.filter({ company_id: company.id, source_key: key }, { limit: 50 })).items;
  let plan;
  try { plan = await operationalPlan(ctx, company, entity, s); } catch (e) { await setIssue(ctx, company, entity, s, '', e.message); return { issue: e.message }; }
  const posted = prior.find((p) => p.status === 'posted');
  if (posted) {
    if (posted.source_version !== plan.fingerprint) { const m = 'Changed after its journal was posted. Correct it with a reviewed reversal and a new journal.'; await setIssue(ctx, company, entity, s, plan.date, m); return { issue: m }; }
    await resolveIssue(ctx, company, entity, s); return { already_posted: true };
  }
  if (prior.some((p) => p.status === 'pending')) return { pending: true };
  if (prior.some((p) => p.status === 'rejected' && p.source_version === plan.fingerprint)) return { rejected: true };
  let lines, totals;
  try {
    openFinanceDate(company, plan.date);
    // Every line carries a cost center: the event for event-linked sources, else the branch.
    const costCenter = plan.dimensions?.event_id || s.branch_id;
    const resolved = (await resolveMappingLines(ctx, company, plan.lines, { date: plan.date, dimensions: plan.dimensions })).map((l) => ({ cost_center: costCenter, ...l }));
    totals = validateLines(resolved, company.currency_decimals);
    lines = await checkedAccounts(ctx, company, resolved, plan.date);
  } catch (e) { await setIssue(ctx, company, entity, s, plan.date, e.message); return { issue: e.message }; }
  if (plan.record) await ctx.svc.entities.CateringReturnedItem.update(s.id, plan.record);
  const proposal = await ctx.svc.entities.FinanceProposal.create({
    company_id: company.id, branch_id: s.branch_id, entry_date: plan.date, description: plan.description, kind: 'manual',
    source_key: key, source_id: s.id, source_entity: entity, source_version: plan.fingerprint, source_summary: { ...plan.summary, operational_source: entity },
    currency: company.currency, business_edition: company.edition, lines, ...totals,
    prepared_by: 'Automatic (operations)', prepared_by_id: 'system', rule_version: OPERATIONAL_RULE,
    evidence_note: `Prepared automatically from ${entity} ${s.id} using Mapping Accounts. Review the source details before approving.`, status: 'pending',
  });
  await resolveIssue(ctx, company, entity, s);
  return { proposal };
}

export async function validateOperationalProposal(ctx, company, p) {
  const s = await ctx.svc.entities[p.source_entity].get(p.source_id).catch(() => null);
  requireValue(s, 'The source record was removed; reject this journal.');
  requireValue(await operationalEligible(ctx, p.source_entity, s), 'The source is no longer final; reject this journal.');
  const plan = await operationalPlan(ctx, company, p.source_entity, s);
  requireValue(plan.fingerprint === p.source_version, 'The source changed after this journal was prepared. Reject it and a fresh one will be prepared.');
}

// After approval: a returned_to_stock item goes back on the shelf once.
export async function applyOperationalEffects(ctx, company, p) {
  if (p.source_entity !== 'CateringReturnedItem') return;
  const s = await ctx.svc.entities.CateringReturnedItem.get(p.source_id);
  if (s.disposition !== 'returned_to_stock' || s.stock_restored_journal_id) return;
  const item = await ctx.svc.entities.InventoryItem.get(s.inventory_item_id);
  const before = Number(item.quantity) || 0, qty = Number(s.quantity) || 0;
  await ctx.svc.entities.InventoryItem.update(item.id, { quantity: Math.round((before + qty) * 10000) / 10000 });
  await ctx.svc.entities.InventoryMovement.create({
    movement_key: `catering_return:${s.id}`, branch_id: s.branch_id, branch_name: s.branch_name, inventory_item_id: item.id, inventory_item_name: item.name,
    direction: 'in', movement_type: 'adjustment', quantity: qty, unit: s.unit, quantity_before: before, quantity_after: before + qty,
    unit_cost: s.original_unit_cost, cost_impact: s.return_value, source_entity: 'CateringReturnedItem', source_id: s.id,
    source_label: `Catering return · ${s.event_name || ''}`, event_id: s.event_id, event_name: s.event_name, occurred_at: new Date().toISOString(),
    actor_email: ctx.user.email, notes: 'Returned unused from the event; valued at the original release cost.',
  });
  await ctx.svc.entities.CateringReturnedItem.update(s.id, { stock_restored_journal_id: p.decision_id || p.id });
}

export async function prepareOperationalBacklog(ctx, company) {
  const counts = { prepared: 0, issues: 0, unchanged: 0 };
  for (const entity of OPERATIONAL_ENTITIES) {
    const rows = await ctx.svc.entities[entity].filter({ branch_id: { $in: company.branch_ids || [] } }, '-created_date', 200);
    for (const s of rows) {
      const r = await prepareOperational(ctx, company, entity, s);
      if (r.proposal) counts.prepared++; else if (r.issue) counts.issues++; else counts.unchanged++;
    }
  }
  return counts;
}