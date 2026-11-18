import { readAll, roundMoney } from './cateringActualCostCommon.js';
import { loadConversionRules, toStockQuantity } from './unitConversion.js';

/** An item's stock unit: InventoryItem.quantity is held in its selling unit (same label the planner reserves in). */
export const stockUnit = (item) => String(item?.selling_unit_label || item?.unit || '').trim();

/**
 * Free stock per item for a requisition's lines (in each item's stock unit):
 * on hand minus every active (reserved) reservation, except the reservations these lines already hold.
 * Reservations in other units (e.g. 'g' vs 'kg') are converted to the item's stock unit before subtracting.
 */
export async function freeStockForLines(svc, lines, rulesArg = null) {
  const ids = [...new Set(lines.map((l) => l.inventory_item_id).filter(Boolean))];
  if (!ids.length) return new Map();
  const own = new Set(lines.map((l) => l.reservation_id).filter(Boolean));
  const [items, reservations, rules] = await Promise.all([
    readAll(svc.entities.InventoryItem, { id: { $in: ids } }),
    readAll(svc.entities.CateringReservation, { inventory_item_id: { $in: ids }, status: 'reserved' }),
    rulesArg ? Promise.resolve(rulesArg) : loadConversionRules(svc),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const held = new Map();
  for (const r of reservations) {
    if (own.has(r.id)) continue;
    const item = itemById.get(r.inventory_item_id);
    const rawQty = Number(r.quantity_reserved) || 0;
    const conv = toStockQuantity(rawQty, r.unit || stockUnit(item), item, rules);
    const qtyInStock = conv.ok ? conv.quantity : rawQty;
    held.set(r.inventory_item_id, (held.get(r.inventory_item_id) || 0) + qtyInStock);
  }
  return new Map(items.map((i) => [i.id, roundMoney((Number(i.quantity) || 0) - (held.get(i.id) || 0))]));
}