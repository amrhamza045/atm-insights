import { requireValue } from './financeValidation.js';
import { financePermission, withFinanceLock } from './financeAccess.js';
import { inventoryDate, inventoryRecord } from './inventoryAccountingContext.js';
import { inventoryPolicy, inventorySnapshotKey } from './inventoryAccountingRules.js';
import { inventoryPlan, postInventoryMovement } from './inventoryAccountingPosting.js';
import { captureEventCogs } from './inventoryEventCogs.js';
import { getItemStockUnit, loadConversionRules, toStockQuantity } from './unitConversion.js';

const MAX_PER_RUN = 40;
const round4 = (n) => Math.round(n * 10000) / 10000;
const outcome = (r) => (r.posted || r.already_posted ? 'posted' : r.blocked ? `blocked: ${r.message}` : r.reason || (r.zero_value ? 'zero value' : 'skipped'));

function resolveSourceIssue(db, company, entity, id) {
  return db.FinancePostingIssue.updateMany({ company_id: company.id, issue_key: `${company.id}:inventory-source:${entity}:${id}`, status: 'open' }, { $set: { status: 'resolved', resolved_at: new Date().toISOString() } });
}

// A completed batch's cost evidence, rebuilt from the ingredient costs saved on it at completion.
async function productionMovement(ctx, company, order, rules) {
  const db = ctx.svc.entities, ids = order.ingredients_consumed.map((i) => i.inventory_item_id);
  const [output, page] = await Promise.all([db.InventoryItem.get(order.output_item_id), db.InventoryItem.filter({ id: { $in: ids } }, { limit: 200 })]);
  const inputs = order.ingredients_consumed.map((i) => {
    const item = page.items.find((x) => x.id === i.inventory_item_id);
    requireValue(item, `Ingredient "${i.inventory_item_name}" no longer exists.`);
    const q = toStockQuantity(Number(i.quantity_consumed) || 0, i.unit || getItemStockUnit(item), item, rules);
    requireValue(q.ok, `${i.inventory_item_name}: ${q.message}`);
    return { inventory_item_id: item.id, category_id: item.category_id, quantity: q.quantity, unit: getItemStockUnit(item), cost: round4(Number(i.cost) || 0) };
  });
  const cost = round4(inputs.reduce((s, i) => s + i.cost, 0)), sourceUnit = order.output_unit || getItemStockUnit(output);
  const out = toStockQuantity(Number(order.actual_output_quantity) || 0, sourceUnit, output, rules);
  requireValue(out.ok && out.quantity > 0, `${order.recipe_name}: the output needs a positive, convertible quantity.`);
  const movement = {
    movement_key: inventorySnapshotKey(company, 'production', order.id), branch_id: order.branch_id, source_entity: 'ProductionOrder', source_id: order.id, resource_id: order.id,
    kind: 'production', status: 'applied', entry_date: await inventoryDate(db, order.completed_date), occurred_at: order.completed_date, currency: company.currency,
    quantity: out.quantity, amount: cost, recognition: 'production', description: `Production · ${order.recipe_name} (catch-up)`,
    snapshot: { inputs, output: { inventory_item_id: output.id, category_id: output.category_id, quantity: out.quantity, source_quantity: Number(order.actual_output_quantity), source_unit: sourceUnit, unit: getItemStockUnit(output), cost }, event_id: order.catering_event_id || '', catch_up: true },
  };
  const plan = await inventoryPlan(ctx, company, movement);
  movement.snapshot.plan = plan; movement.binding_ids = [...new Set(plan.mapping_bindings.map((b) => b.binding_id))];
  return movement;
}

// Released lines that are not production inputs carry no saved cost before stock accounting was on.
async function unvaluedReleaseLines(db, company, event) {
  const slips = await db.KitchenReleaseSlip.filter({ event_id: event.id, status: { $in: ['released', 'received', 'fulfilled'] } }, { limit: 200 });
  let missing = 0;
  for (const s of slips.items) for (const l of s.lines || []) {
    if (l.purpose === 'production_input' || !(Number(l.actual_quantity) > 0)) continue;
    if (!(await db.InventoryAccountingMovement.count({ company_id: company.id, movement_key: inventorySnapshotKey(company, 'custody_issue', `${s.id}:${l.reservation_id}`) }))) missing++;
  }
  return missing;
}

// One-time catch-up for activity between the stock accounting start date and the day it was
// switched on: completed productions, then closed events on their finalization day. Only costs
// saved at the time are used; anything without one is listed for review, never valued at today's
// prices. Re-running skips what is already captured; `more` means run it again.
export async function catchUpInventoryHistory(ctx, company, input) {
  financePermission(ctx, 'finance_accounts_manage'); financePermission(ctx, 'finance_journal_approve');
  requireValue(ctx.admin || !ctx.permissions.branch_id, 'The catch-up requires unrestricted company access.', 403);
  const policy = inventoryPolicy(company);
  requireValue(policy.enabled, 'Switch stock accounting on before catching up its history.');
  const db = ctx.svc.entities, rules = await loadConversionRules(db), report = { from: policy.from, productions: [], events: [], review: [], more: false };
  const inRange = async (ts) => !!ts && (await inventoryDate(db, ts)) >= policy.from;
  const run = async (label, work, entity, id) => {
    try { const r = await withFinanceLock(ctx, company, work); if (r.posted || r.already_posted) await resolveSourceIssue(db, company, entity, id); else if (r.blocked) report.review.push({ source: label, message: r.message }); return outcome(r); }
    catch (error) { if (![400, 409].includes(error.status)) throw error; report.review.push({ source: label, message: error.message }); return `blocked: ${error.message}`; }
  };
  let done = 0;
  const orders = await db.ProductionOrder.filter({ branch_id: { $in: company.branch_ids }, status: 'completed' }, { sort: 'completed_date', limit: 1000 });
  for (const order of orders.items) {
    if (!order.ingredients_consumed?.length || !(await inRange(order.completed_date))) continue;
    if (await db.InventoryAccountingMovement.count({ company_id: company.id, movement_key: inventorySnapshotKey(company, 'production', order.id) })) continue;
    if (done++ >= MAX_PER_RUN) { report.more = true; return report; }
    const result = await run(`Production ${order.recipe_name}`, async (fresh) => postInventoryMovement(ctx, fresh, await inventoryRecord(ctx, fresh, await productionMovement(ctx, fresh, order, rules))), 'ProductionOrder', order.id);
    report.productions.push({ name: order.recipe_name, completed: order.completed_date, result });
  }
  const events = await db.CateringEvent.filter({ branch_id: { $in: company.branch_ids }, status: 'completed' }, { sort: 'event_date', limit: 500 });
  for (const event of events.items) {
    if (await db.InventoryAccountingMovement.count({ company_id: company.id, movement_key: inventorySnapshotKey(company, 'event_cogs', event.id) })) continue;
    const rec = await db.CateringReconciliation.filter({ event_id: event.id, status: 'finalized' }, { sort: '-finalized_date', limit: 1 });
    const closedAt = rec.items[0]?.finalized_date;
    if (!(await inRange(closedAt))) continue;
    const missing = await unvaluedReleaseLines(db, company, event);
    if (missing) { report.review.push({ source: `Event ${event.event_name}`, message: `${missing} released line(s) have no saved cost; review them before its cost of sales is recognized.` }); continue; }
    if (done++ >= MAX_PER_RUN) { report.more = true; return report; }
    const result = await run(`Event ${event.event_name}`, async (fresh) => {
      const m = await captureEventCogs(ctx, fresh, event, closedAt);
      return m ? postInventoryMovement(ctx, fresh, m) : { reason: 'Nothing consumed to recognize.' };
    }, 'CateringEvent', event.id);
    report.events.push({ name: event.event_name, closed: closedAt, result });
  }
  return report;
}