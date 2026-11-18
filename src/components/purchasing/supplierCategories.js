// Single rule for "which suppliers may supply this inventory category".
export const supplierCoversCategory = (supplier, categoryId) =>
  !!categoryId && (supplier?.supplied_category_ids || []).includes(categoryId);

// Returns { list, filtered, noMatch }. Without a category, or when no supplier
// is tagged for it, all suppliers are returned so the buyer is never blocked.
export function suppliersForCategory(suppliers, categoryId, showAll = false) {
  if (showAll || !categoryId) return { list: suppliers, filtered: false, noMatch: false };
  const list = suppliers.filter((s) => supplierCoversCategory(s, categoryId));
  if (list.length === 0) return { list: suppliers, filtered: false, noMatch: true };
  return { list, filtered: true, noMatch: false };
}

// Draft-PO grouping: keep the preferred supplier when it covers the category,
// else the first tagged supplier that does, else fall back to the preferred one.
export function pickSupplierForItem(item, suppliers) {
  const preferred = suppliers.find((s) => s.id === item.supplier_id);
  if (!item.category_id || supplierCoversCategory(preferred, item.category_id)) {
    return { supplierId: item.supplier_id, fallback: false };
  }
  const match = suppliers.find((s) => s.is_active && supplierCoversCategory(s, item.category_id));
  if (match) return { supplierId: match.id, fallback: false };
  return { supplierId: item.supplier_id, fallback: true };
}