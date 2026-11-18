import { computeIngredientCost, getItemStockUnit } from './unitConversion.js';

const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;

// m: { key, direction, type, quantity, unit?, before?, after?, cost_impact?, source_entity, source_id, source_label, event_id?, event_name?, actor_email?, notes? }
export function movementRow(item, m, rules = []) {
  const quantity = round4(Math.abs(Number(m.quantity) || 0));
  const unit = m.unit || getItemStockUnit(item) || item.unit || '';
  const unitCost = Number(item.cost_per_unit) || 0;
  let cost = m.cost_impact;
  if (cost == null) {
    const c = computeIngredientCost(quantity, unit, item, rules);
    cost = c.ok ? c.totalCost : quantity * unitCost;
  }
  return {
    movement_key: m.key,
    branch_id: item.branch_id || '',
    branch_name: item.branch_name || '',
    inventory_item_id: item.id,
    inventory_item_name: item.name || '',
    direction: m.direction,
    movement_type: m.type,
    quantity,
    unit,
    ...(m.before != null ? { quantity_before: round4(m.before) } : {}),
    ...(m.after != null ? { quantity_after: round4(m.after) } : {}),
    unit_cost: round4(unitCost),
    cost_impact: round4(Math.abs(cost)),
    source_entity: m.source_entity || '',
    source_id: m.source_id || '',
    source_label: m.source_label || '',
    event_id: m.event_id || '',
    event_name: m.event_name || '',
    occurred_at: m.occurred_at || new Date().toISOString(),
    actor_email: m.actor_email || '',
    notes: m.notes || '',
  };
}

// History is recorded after stock has moved: a failure here is logged, never undoes the stock change.
export async function recordMovements(db, rows) {
  const list = rows.filter((r) => r && r.quantity > 0 && r.movement_key);
  if (!list.length) return [];
  try {
    const keys = list.map((r) => r.movement_key);
    const existing = await db.InventoryMovement.filter({ movement_key: { $in: keys } }, '-created_date', keys.length);
    const seen = new Set(existing.map((e) => e.movement_key));
    const fresh = list.filter((r) => !seen.has(r.movement_key) && seen.add(r.movement_key));
    return fresh.length ? await db.InventoryMovement.bulkCreate(fresh) : [];
  } catch (error) {
    console.error('Stock movement history was not recorded', error);
    return [];
  }
}