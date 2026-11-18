import { base44 } from "@/api/base44Client";
import { supplierCoversCategory } from "./supplierCategories";

/**
 * One rule for every purchase-order save: each line's supplier must be tagged
 * for the item's inventory category. Items without a category are allowed.
 * lines: [{ supplier_id, supplier_name?, inventory_item_id, inventory_item_name? }]
 * Throws one error naming every blocked line; resolves when every line passes.
 */
export async function assertSuppliersCoverCategories(lines) {
  const rows = (lines || []).filter((l) => l?.inventory_item_id);
  if (!rows.length) return;
  const itemIds = [...new Set(rows.map((l) => l.inventory_item_id))];
  const supplierIds = [...new Set(rows.map((l) => l.supplier_id).filter(Boolean))];
  const [items, suppliers] = await Promise.all([
    base44.entities.InventoryItem.filter({ id: { $in: itemIds } }, "name", itemIds.length),
    supplierIds.length ? base44.entities.Supplier.filter({ id: { $in: supplierIds } }, "name", supplierIds.length) : [],
  ]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const blocked = new Map();
  rows.forEach((l) => {
    const item = itemById.get(l.inventory_item_id);
    if (!item?.category_id) return;
    const supplier = supplierById.get(l.supplier_id);
    if (supplierCoversCategory(supplier, item.category_id)) return;
    const who = supplier?.name || l.supplier_name || "No supplier";
    const what = `${item.name || l.inventory_item_name} (${item.category_name || "its category"})`;
    blocked.set(who, [...new Set([...(blocked.get(who) || []), what])]);
  });
  if (!blocked.size) return;

  const parts = [...blocked].map(([who, names]) => `${who} isn't tagged to supply ${names.join(", ")}`);
  throw new Error(`${parts.join(". ")}. Choose a supplier tagged for these categories, or add the categories to the supplier under Suppliers.`);
}

/** The same check for an order with a single supplier. */
export const assertOrderSupplierCovers = (supplierId, supplierName, items) =>
  assertSuppliersCoverCategories((items || []).map((i) => ({ ...i, supplier_id: supplierId, supplier_name: supplierName })));