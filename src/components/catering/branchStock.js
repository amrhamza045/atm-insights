import { base44 } from "@/api/base44Client";
import { round2 } from "./cateringLogic";

/**
 * Each branch plans its events from its own stock. Recipes, menu items and packages
 * point at one branch's stock items; this finds the same item in the event's branch —
 * a copy linked to it (source_item_id), or the one item there with the same name — and
 * adds the ones the branch doesn't stock yet, with none on hand, so they show as
 * shortfalls to buy for that branch. Matching follows the server's (shared/branchStock.js).
 */
const norm = (s) => String(s || "").trim().toLowerCase();
const family = (item) => item.source_item_id || item.id;

function branchItemFinder(items, branchId) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const byFamily = new Map();
  const byName = new Map();
  items.filter((i) => i.branch_id === branchId).forEach((i) => {
    if (!byFamily.has(family(i))) byFamily.set(family(i), i);
    const key = norm(i.name);
    byName.set(key, byName.has(key) ? null : i); // a name two items share matches neither
  });
  // The id to plan with: the item itself when it's the branch's own, shared or unknown;
  // otherwise its twin in the branch, or null when the branch doesn't stock it.
  return (itemId) => {
    const item = byId.get(itemId);
    if (!item || !item.branch_id || item.branch_id === branchId) return itemId;
    return (byFamily.get(family(item)) || byName.get(norm(item.name)))?.id || null;
  };
}

// Every item the plan touches, including what goes into anything cooked for it (sub-recipes too).
async function planItemIds(requirements) {
  const ids = new Set([
    ...requirements.stockPulls.map((s) => s.inventory_item_id),
    ...requirements.productionBatches.flatMap((b) => [b.output_item_id, ...b.inputs.map((i) => i.inventory_item_id)]),
  ].filter(Boolean));
  const recipes = await base44.entities.Recipe.list("-created_date", 500);
  const byOutput = new Map(recipes.filter((r) => r.status !== "inactive" && r.output_item_id).map((r) => [r.output_item_id, r]));
  const queue = [...ids];
  while (queue.length) {
    (byOutput.get(queue.pop())?.ingredients || []).forEach(({ inventory_item_id: id }) => {
      if (id && !ids.has(id)) { ids.add(id); queue.push(id); }
    });
  }
  return [...ids];
}

/** Points an event's requirements at its branch's own items. Returns them and the names of items added. */
export async function toBranchStock(requirements, branchId) {
  if (!branchId) return { requirements, added: [] };
  const load = () => base44.entities.InventoryItem.list("-created_date", 1000);
  let items = await load();
  let find = branchItemFinder(items, branchId);
  const missing = (await planItemIds(requirements)).filter((id) => find(id) === null);
  if (missing.length) {
    await base44.functions.invoke("addBranchStockItems", { branch_id: branchId, item_ids: missing });
    items = await load();
    find = branchItemFinder(items, branchId);
  }
  const local = (id) => find(id) || id;

  const pulls = new Map();
  requirements.stockPulls.forEach((s) => {
    const id = local(s.inventory_item_id);
    const prev = pulls.get(id);
    if (prev) prev.qty = round2(prev.qty + s.qty);
    else pulls.set(id, { ...s, inventory_item_id: id });
  });
  return {
    requirements: {
      ...requirements,
      stockPulls: [...pulls.values()],
      productionBatches: requirements.productionBatches.map((b) => ({
        ...b,
        output_item_id: local(b.output_item_id),
        inputs: b.inputs.map((inp) => ({ ...inp, inventory_item_id: local(inp.inventory_item_id) })),
      })),
    },
    added: missing.map((id) => items.find((i) => i.id === id)?.name).filter(Boolean),
  };
}