import { base44 } from "@/api/base44Client";

export const PREP_CATEGORY_NAME = "Recipe Prep Items";

// Find or create the branch's "Recipe Prep Items" inventory category.
async function ensurePrepCategory(branchId, branchName) {
  const query = branchId ? { name: PREP_CATEGORY_NAME, branch_id: branchId } : { name: PREP_CATEGORY_NAME };
  const [existing] = await base44.entities.InventoryCategory.filter(query);
  if (existing) return existing;
  return base44.entities.InventoryCategory.create({
    name: PREP_CATEGORY_NAME,
    description: "Items produced from recipes (prep components and finished batches)",
    branch_id: branchId || null,
    branch_name: branchName || null,
    is_active: true,
  });
}

// Creates the output stock item when a new name is given, and makes sure the
// recipe's output item lives in the prep category so it shows in stock lists.
// Returns { id, name } of the output item.
export async function syncRecipeOutputItem({ outputItemId, newItemName, unit, branchId, branchName }) {
  const category = await ensurePrepCategory(branchId, branchName);
  const catFields = { category_id: category.id, category_name: category.name };

  if (newItemName?.trim()) {
    const item = await base44.entities.InventoryItem.create({
      name: newItemName.trim(),
      branch_id: branchId || null,
      branch_name: branchName || null,
      quantity: 0,
      unit: unit || "",
      selling_unit_label: unit || "",
      ...catFields,
    });
    return { id: item.id, name: item.name };
  }

  const item = await base44.entities.InventoryItem.get(outputItemId);
  if (item.category_id !== category.id) await base44.entities.InventoryItem.update(item.id, catFields);
  return { id: item.id, name: item.name };
}