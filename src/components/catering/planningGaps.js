/**
 * Single source of truth for whether a quote line can be planned into inventory.
 * Returns null when plannable/excluded, otherwise a reason string.
 */
export const hasStockableRecipe = (mi) => (mi?.recipe || []).some((ing) => ing.inventory_item_id);

export function lineGapReason(li, menuItems) {
  if ((Number(li.quantity) || 0) <= 0) return null;
  if ((li.cost_category || "food") !== "food") return null;
  if (li.manually_sourced) return null;
  const mi = li.menu_item_id ? menuItems.find((m) => m.id === li.menu_item_id) : null;
  if (!mi) return "bespoke line — no menu item";
  if (!(mi.recipe || []).length) return "menu item has no recipe";
  if (!hasStockableRecipe(mi)) return "recipe has no stockable ingredients";
  return null;
}

/** Unmapped lines with their original index on the quote. */
export function findPlanningGaps(quote, menuItems) {
  return (quote?.line_items || [])
    .map((li, index) => ({ index, name: li.name || "Unnamed line", quantity: Number(li.quantity) || 0, reason: lineGapReason(li, menuItems) }))
    .filter((g) => g.reason);
}