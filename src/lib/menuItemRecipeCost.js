import { computeIngredientCost, getItemStockUnit } from "@/lib/unitConversion";

export const roundRecipeCost = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Compute the cost of a single recipe ingredient row using unit conversion rules
 * and optional sub-recipe batch cost fallback.
 */
export function computeRecipeRowCost(row, inventoryItems = [], unitRules = [], recipes = []) {
  if (!row?.inventory_item_id) {
    return { cost: 0, ok: false, selectedItem: null, costRes: null };
  }
  const selectedItem = inventoryItems.find((x) => x.id === row.inventory_item_id) || null;
  const qty = Number(row.quantity_needed) || 0;
  if (!selectedItem || qty <= 0) {
    return { cost: 0, ok: false, selectedItem, costRes: null };
  }

  const sub = recipes.find(
    (r) => r.status === "active" && r.output_item_id === row.inventory_item_id
  );
  const subCostPerUnit = sub
    ? (Number(sub.total_cost) || 0) / (Number(sub.output_quantity) || 1)
    : null;

  const stockUnit = getItemStockUnit(selectedItem);
  const costRes = computeIngredientCost(
    qty,
    row.unit || stockUnit,
    selectedItem,
    unitRules,
    subCostPerUnit
  );

  if (costRes?.ok) {
    return {
      cost: Number(costRes.totalCost) || 0,
      ok: true,
      selectedItem,
      costRes,
    };
  }

  const fallbackUnitCost = Number(selectedItem?.cost_per_unit) || Number(subCostPerUnit) || 0;
  const fallbackCost = fallbackUnitCost * qty;
  return {
    cost: fallbackCost,
    ok: fallbackCost > 0,
    selectedItem,
    costRes,
  };
}

/**
 * Sum the calculated cost of all ingredient rows in a recipe array.
 */
export function computeRecipeTotalCost(rows = [], inventoryItems = [], unitRules = [], recipes = []) {
  let total = 0;
  let costedCount = 0;
  let activeCount = 0;

  for (const row of rows || []) {
    if (!row?.inventory_item_id) continue;
    activeCount += 1;
    const { cost } = computeRecipeRowCost(row, inventoryItems, unitRules, recipes);
    if (cost > 0) costedCount += 1;
    total += cost;
  }

  return {
    totalCost: roundRecipeCost(total),
    costedCount,
    activeCount,
  };
}

/**
 * Resolve the authoritative unit food cost of a MenuItem:
 * uses live recipe ingredient sum when inventory items are available,
 * otherwise falls back to stored menuItem.total_cost.
 */
export function resolveMenuItemUnitCost(menuItem, inventoryItems = [], unitRules = [], recipes = []) {
  if (!menuItem) return 0;
  if (Array.isArray(menuItem.recipe) && menuItem.recipe.length > 0 && inventoryItems.length > 0) {
    const { totalCost } = computeRecipeTotalCost(
      menuItem.recipe,
      inventoryItems,
      unitRules,
      recipes
    );
    if (totalCost > 0) return totalCost;
  }
  return roundRecipeCost(menuItem.total_cost || 0);
}