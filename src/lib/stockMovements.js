import { base44 } from "@/api/base44Client";
import { computeIngredientCost, getItemStockUnit } from "@/lib/unitConversion";

// Screen-side twin of base44/shared/inventoryMovements.js for stock changes made from the browser.
const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;

export function stockMovement(item, m, rules = []) {
  const quantity = round4(Math.abs(Number(m.quantity) || 0));
  const unit = m.unit || getItemStockUnit(item) || item.unit || "";
  const unitCost = Number(item.cost_per_unit) || 0;
  let cost = m.cost_impact;
  if (cost == null) {
    const c = computeIngredientCost(quantity, unit, item, rules);
    cost = c.ok ? c.totalCost : quantity * unitCost;
  }
  return {
    movement_key: m.key, branch_id: item.branch_id || "", branch_name: item.branch_name || "",
    inventory_item_id: item.id, inventory_item_name: item.name || "",
    direction: m.direction, movement_type: m.type, quantity, unit,
    ...(m.before != null ? { quantity_before: round4(m.before) } : {}),
    ...(m.after != null ? { quantity_after: round4(m.after) } : {}),
    unit_cost: round4(unitCost), cost_impact: round4(Math.abs(cost)),
    source_entity: m.source_entity || "", source_id: m.source_id || "", source_label: m.source_label || "",
    event_id: m.event_id || "", event_name: m.event_name || "",
    occurred_at: new Date().toISOString(), actor_email: m.actor_email || "", notes: m.notes || "",
  };
}

// A before→after quantity change as one in/out movement (nothing when unchanged).
export function quantityChange(item, before, after, m) {
  const delta = (Number(after) || 0) - (Number(before) || 0);
  if (!delta) return null;
  return stockMovement(item, { ...m, direction: delta > 0 ? "in" : "out", quantity: delta, before, after });
}

export async function logStockMovements(rows) {
  const list = rows.filter((r) => r && r.quantity > 0 && r.movement_key);
  if (!list.length) return;
  try {
    const existing = await base44.entities.InventoryMovement.filter({ movement_key: { $in: list.map((r) => r.movement_key) } }, "-created_date", list.length);
    const seen = new Set(existing.map((e) => e.movement_key));
    const fresh = list.filter((r) => !seen.has(r.movement_key) && seen.add(r.movement_key));
    if (fresh.length) await base44.entities.InventoryMovement.bulkCreate(fresh);
  } catch (error) {
    console.error("Stock movement history was not recorded", error);
  }
}