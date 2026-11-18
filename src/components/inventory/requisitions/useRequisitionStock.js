import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toStockQuantity, convertQuantity, getItemStockUnit } from "@/lib/unitConversion";

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

/**
 * Live free stock per item for a requisition's lines: on hand minus active reservations,
 * not counting the reservations these lines already hold (same rule the server re-checks).
 * Converts reservation quantities to the item's stock unit, and provides per-line free stock
 * converted into the line's requested unit when needed.
 */
export function useRequisitionStock(lines) {
  const ids = [...new Set(lines.map((l) => l.inventory_item_id).filter(Boolean))].sort();
  const own = [...new Set(lines.map((l) => l.reservation_id).filter(Boolean))].sort();
  const query = useQuery({
    queryKey: ["requisition-stock", ids, own],
    enabled: ids.length > 0,
    refetchInterval: 30000,
    queryFn: async () => {
      const [items, reservations, unitRules] = await Promise.all([
        base44.entities.InventoryItem.filter({ id: { $in: ids } }, "name", 500),
        base44.entities.CateringReservation.filter({ inventory_item_id: { $in: ids }, status: "reserved" }),
        base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => []),
      ]);
      const ownSet = new Set(own);
      const itemById = new Map(items.map((i) => [i.id, i]));
      const held = new Map();
      for (const r of reservations) {
        if (ownSet.has(r.id)) continue;
        const item = itemById.get(r.inventory_item_id);
        const rawQty = Number(r.quantity_reserved) || 0;
        const conv = item ? toStockQuantity(rawQty, r.unit || getItemStockUnit(item), item, unitRules) : { ok: true, quantity: rawQty };
        const qtyInStock = conv.ok ? conv.quantity : rawQty;
        held.set(r.inventory_item_id, (held.get(r.inventory_item_id) || 0) + qtyInStock);
      }
      return {
        unitRules,
        itemById,
        byItem: new Map(
          items.map((i) => [
            i.id,
            {
              on_hand: Number(i.quantity) || 0,
              free: round2((Number(i.quantity) || 0) - (held.get(i.id) || 0)),
              unit: getItemStockUnit(i),
            },
          ])
        ),
      };
    },
  });
  const byItem = query.data?.byItem || new Map();
  const itemById = query.data?.itemById || new Map();
  const unitRules = query.data?.unitRules || [];

  // Map item_id -> free quantity converted to the line's unit if lines for that item use a single unit
  const free = new Map();
  for (const [id, s] of byItem) {
    const sampleLine = lines.find((l) => l.inventory_item_id === id && l.unit);
    const item = itemById.get(id);
    if (sampleLine && item && s.unit) {
      const conv = convertQuantity(s.free, s.unit, sampleLine.unit, { item, itemId: id, rules: unitRules });
      free.set(id, conv.ok ? round2(conv.quantity) : s.free);
    } else {
      free.set(id, s.free);
    }
  }

  return { stock: byItem, free, loading: query.isLoading };
}