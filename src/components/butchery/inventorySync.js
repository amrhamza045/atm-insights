import { base44 } from "@/api/base44Client";
import { quantityChange, logStockMovements } from "@/lib/stockMovements";

/**
 * Ensures a ButcheryRawMaterial has a live linked InventoryItem.
 * - Reuses the existing link if the item still exists.
 * - Otherwise finds an inventory item with the same name (and branch when given).
 * - Otherwise creates a new one and links it back to the raw material.
 * Returns the InventoryItem.
 */
/**
 * Resolves the human-readable item name for a raw material —
 * the source cut / by-product name, falling back to the SKU number.
 */
export async function resolveItemName(rm) {
  if (rm.item_name) return rm.item_name;
  try {
    if (rm.primal_cut_id) {
      const cut = await base44.entities.PrimalCut.get(rm.primal_cut_id);
      if (cut?.cut_name) return cut.cut_name;
    }
    if (rm.waste_byproduct_id) {
      const bp = await base44.entities.WasteByProduct.get(rm.waste_byproduct_id);
      if (bp?.name || bp?.category) return bp.name || bp.category;
    }
  } catch {
    // source record gone — fall back to SKU
  }
  return rm.sku_name;
}

export async function ensureInventoryLink(rm, { branchId, branchName } = {}) {
  // 1. Existing link still valid?
  if (rm.inventory_item_id) {
    try {
      const item = await base44.entities.InventoryItem.get(rm.inventory_item_id);
      if (item) return item;
    } catch {
      // linked item was deleted — fall through and re-link
    }
  }

  const itemName = await resolveItemName(rm);

  // 2. Match by name (+ branch when available)
  const matches = await base44.entities.InventoryItem.filter({ name: itemName });
  let item = branchId ? matches.find((i) => i.branch_id === branchId) : matches[0];

  // 3. Create if nothing found
  if (!item) {
    item = await base44.entities.InventoryItem.create({
      name: itemName,
      branch_id: branchId || null,
      branch_name: branchName || null,
      quantity: rm.quantity || 0,
      unit: rm.unit || "kg",
      purchase_unit: "weight",
      purchase_unit_label: rm.unit || "kg",
      selling_unit: "weight",
      selling_unit_label: rm.unit || "kg",
      cost_per_unit: rm.unit_cost || 0,
      category_name: "Butchery",
    });
  }

  if (rm.inventory_item_id !== item.id) {
    await base44.entities.ButcheryRawMaterial.update(rm.id, { inventory_item_id: item.id });
  }
  return item;
}

/**
 * Syncs the linked InventoryItem after a raw-material change.
 * Options:
 *  - setQuantity: absolute new stock level
 *  - quantityDelta: relative change (+/-)
 *  - name: sync renamed SKU
 *  - unitCost: sync cost per unit
 */
export async function syncInventory(rm, { setQuantity, quantityDelta = 0, name, unitCost, branchId, branchName } = {}) {
  const item = await ensureInventoryLink(rm, { branchId, branchName });
  const updates = {};
  if (setQuantity !== undefined) {
    updates.quantity = Math.max(0, setQuantity);
  } else if (quantityDelta) {
    updates.quantity = Math.max(0, (item.quantity || 0) + quantityDelta);
  }
  if (name && name !== item.name) updates.name = name;
  if (unitCost !== undefined && unitCost !== item.cost_per_unit) updates.cost_per_unit = unitCost;
  if (Object.keys(updates).length) {
    await base44.entities.InventoryItem.update(item.id, updates);
    if (updates.quantity !== undefined) await logStockMovements([quantityChange(item, item.quantity || 0, updates.quantity, {
      key: `butchery_sync:${rm.id}:${Date.now()}`, type: "adjustment", source_entity: "ButcheryRawMaterial", source_id: rm.id,
      source_label: `Butchery stock update · ${rm.sku_name || rm.item_name || ""}`.trim(),
    })]);
  }
  return item;
}

/**
 * Removes the linked InventoryItem when a raw material is deleted.
 * Silently ignores an already-missing item.
 */
export async function deleteLinkedInventory(rm) {
  if (!rm.inventory_item_id) return;
  try {
    await base44.entities.InventoryItem.delete(rm.inventory_item_id);
  } catch {
    // already gone — nothing to do
  }
}