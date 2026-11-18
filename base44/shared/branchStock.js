// Each branch plans and cooks its catering events from its own stock. Recipes, menu
// items and packages point at one branch's stock items; these helpers find the same
// item in another branch: a copy linked to it (source_item_id), or the one item there
// with the same name. The planning screens match items the same way.
import { readAll } from './cateringActualCostCommon.js';

const norm = (s) => String(s || '').trim().toLowerCase();
const family = (item) => item.source_item_id || item.id;

/** From one branch's items: item => that branch's twin of it, or null. */
export function twinFinder(branchItems) {
  const byFamily = new Map();
  const byName = new Map();
  for (const i of branchItems) {
    if (!byFamily.has(family(i))) byFamily.set(family(i), i);
    const key = norm(i.name);
    byName.set(key, byName.has(key) ? null : i); // a name two items share matches neither
  }
  return (item) => byFamily.get(family(item)) || byName.get(norm(item.name)) || null;
}

/**
 * For an event's batches: itemId => the item the event's branch uses. Items the event's
 * live plan already holds stay as they are (events planned before branches kept their
 * own stock keep working); another branch's item becomes this branch's twin when it has one.
 */
export async function eventItemLocalizer(db, eventId, branchId) {
  if (!branchId) return async (itemId) => itemId;
  const [own, reservations, orders] = await Promise.all([
    readAll(db.InventoryItem, { branch_id: branchId }),
    readAll(db.CateringReservation, { event_id: eventId, status: { $in: ['reserved', 'consumed'] } }),
    readAll(db.ProductionOrder, { catering_event_id: eventId, status: { $ne: 'cancelled' } }),
  ]);
  const keep = new Set(
    [...own.map((i) => i.id), ...reservations.map((r) => r.inventory_item_id), ...orders.map((o) => o.output_item_id)].filter(Boolean)
  );
  const twinOf = twinFinder(own);
  const cache = new Map();
  return async (itemId) => {
    if (!itemId || keep.has(itemId)) return itemId;
    if (!cache.has(itemId)) {
      const item = await db.InventoryItem.get(itemId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      cache.set(itemId, (item?.branch_id && twinOf(item)?.id) || itemId);
    }
    return cache.get(itemId);
  };
}