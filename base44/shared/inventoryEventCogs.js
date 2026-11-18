import { requireValue } from './financeValidation.js';
import { inventoryRecord, inventoryDate } from './inventoryAccountingContext.js';
import { inventorySnapshotKey, inventoryPolicy } from './inventoryAccountingRules.js';
import { inventoryPlan } from './inventoryAccountingPosting.js';
import { captureDeliveryInventory } from './inventoryDeliveryCapture.js';
import { eventIssuedStock } from './inventoryEventIssues.js';
import { loadConversionRules, toStockQuantity } from './unitConversion.js';

// Reusable stock back on the shelf comes off the item's issued lines in proportion.
async function netReturns(ctx, event, lines) {
  const db = ctx.svc.entities, ids = [];
  const returns = await db.CateringReturnedItem.filter({ event_id: event.id, condition: 'reusable', disposition: 'returned_to_stock' }, { limit: 500 });
  const rules = await loadConversionRules(ctx.svc);
  for (const r of returns.items) {
    const own = lines.filter((l) => l.inventory_item_id === r.inventory_item_id);
    if (!own.length) continue;
    const item = await db.InventoryItem.get(r.inventory_item_id);
    const conv = toStockQuantity(Number(r.quantity) || 0, r.unit, item, rules);
    requireValue(conv.ok, `Returned "${r.item_name}" uses a unit that cannot be converted to its stock unit.`);
    const left = own.reduce((s, l) => s + l.quantity - (l.returned || 0), 0);
    const ratio = left > 0 ? Math.min(1, conv.quantity / left) : 0;
    for (const l of own) l.returned = (l.returned || 0) + (l.quantity - (l.returned || 0)) * ratio;
    ids.push(r.id);
  }
  return ids;
}

function consumedItems(company, lines) {
  const scale = 10 ** company.currency_decimals, groups = new Map();
  for (const l of lines) {
    const left = l.quantity - (l.returned || 0);
    if (left <= 1e-8) continue;
    const key = `${l.inventory_item_id}:${l.issue_type}`;
    const g = groups.get(key) || { inventory_item_id: l.inventory_item_id, category_id: l.category_id, unit: l.unit, issue_type: l.issue_type, issued_quantity: 0, returned_quantity: 0, quantity: 0, cost: 0 };
    g.issued_quantity += l.quantity; g.returned_quantity += l.returned || 0; g.quantity += left;
    g.cost += left >= l.quantity - 1e-8 ? l.cost : l.cost * left / l.quantity;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ ...g, cost: Math.round(g.cost * scale) / scale }));
}

// Event close: COGS = everything issued to the event (delivered or not, planned or
// extra, plus event production) minus reusable stock returned to the shelf, at the
// carrying cost it left inventory with. Each line keeps its issue type for routing.
// closedAt: the history catch-up passes the reconciliation's finalization time; live closes use now.
export async function captureEventCogs(ctx, company, event, closedAt = new Date().toISOString()) {
  const db = ctx.svc.entities;
  requireValue(event.status === 'completed', 'COGS is recognized only after the event is closed.', 409);
  const key = inventorySnapshotKey(company, 'event_cogs', event.id);
  const prior = await db.InventoryAccountingMovement.filter({ company_id: company.id, movement_key: key }, { limit: 1 });
  if (prior.items.length) return prior.items[0];
  const occurred_at = closedAt, entry_date = await inventoryDate(db, occurred_at);
  if (entry_date < inventoryPolicy(company).from) return null;

  const checkpoints = await db.CateringCustodyCheckpoint.filter({ event_id: event.id, stage: 'delivered' }, { limit: 200 });
  requireValue(!checkpoints.has_more, 'Too many delivery checkpoints for one event.');
  const deliveries = [];
  for (const c of checkpoints.items) deliveries.push(...(await captureDeliveryInventory(ctx, company, c)));

  const issued = await eventIssuedStock(ctx, company, event, deliveries.filter((m) => m.recognition === 'event_close' && m.status === 'applied'));
  if (!issued.lines.length) return null;
  const returnedIds = await netReturns(ctx, event, issued.lines);
  const items = consumedItems(company, issued.lines);
  if (!items.length) return null;

  const scale = 10 ** company.currency_decimals;
  const movement = {
    movement_key: key, branch_id: event.branch_id, source_entity: 'CateringEvent', source_id: event.id, resource_id: `event:${event.id}`,
    kind: 'delivery', status: 'applied', entry_date, occurred_at, currency: company.currency, recognition: 'event_close',
    description: `Event close · ${event.event_name || event.id}`,
    quantity: items.reduce((s, i) => s + i.quantity, 0), amount: Math.round(items.reduce((s, i) => s + i.cost, 0) * scale) / scale,
    snapshot: { items, event_id: event.id, delivery_movement_ids: deliveries.map((m) => m.id), source_movement_ids: issued.ids, returned_item_ids: returnedIds },
  };
  // A routing gap does not lose the evidence: the movement is kept and posting names the missing mapping.
  try {
    const plan = await inventoryPlan(ctx, company, movement);
    movement.snapshot.plan = plan; movement.binding_ids = [...new Set(plan.mapping_bindings.map((b) => b.binding_id))];
  } catch (error) { if (![400, 409].includes(error.status)) throw error; }
  return inventoryRecord(ctx, company, movement);
}