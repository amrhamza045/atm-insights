const requireSupplier = (condition, message) => {
  if (!condition) throw Object.assign(new Error(message), { status: 400 });
};

// One document has one actual supplier; item preferences do not override the buyer's choice.
export async function validatePurchaseSupplier(entities, document) {
  const id = document?.supplier_id;
  requireSupplier(typeof id === 'string' && id.trim() && id === id.trim(), 'Choose exactly one supplier per purchase order and invoice.');
  requireSupplier(Array.isArray(document.items) && document.items.length > 0 && document.items.length <= 500, 'Provide 1–500 purchase lines.');
  requireSupplier(document.items.every(line => !line.supplier_id || line.supplier_id === id), 'Every line must belong to the one supplier selected for this document. Split suppliers into separate orders and invoices.');
  const supplier = await entities.Supplier.get(id).catch(error => error.status === 404 ? null : Promise.reject(error));
  requireSupplier(supplier && supplier.is_active !== false, 'The selected supplier is missing or inactive.');
  const ids = [...new Set(document.items.map(line => line.inventory_item_id))];
  requireSupplier(ids.every(value => typeof value === 'string' && value), 'Every purchase line needs an inventory item.');
  const page = await entities.InventoryItem.filter({ id: { $in: ids } }, { limit: 500 });
  requireSupplier(!page.has_more && page.items.length === ids.length, 'One or more purchase items no longer exist.');
  for (const item of page.items) {
    requireSupplier(!item.category_id || (supplier.supplied_category_ids || []).includes(item.category_id), `${supplier.name} is not assigned to supply the category for ${item.name || item.id}.`);
  }
  return supplier;
}