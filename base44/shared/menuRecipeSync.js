import {
  loadConversionRules,
  computeIngredientCost,
  getItemStockUnit,
} from './unitConversion.js';

const round = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Synchronize a MenuItem's recipe (the authoritative source of truth) to its
 * corresponding Manufacturing Recipe and finished-product InventoryItem.
 * Uses UnitConversionRule records so ingredient quantities in grams/ml/custom units
 * are accurately costed against the InventoryItem's purchase/cost unit.
 */
export async function syncMenuRecipeToManufacturing(svc, menuItem, userEmail = '', context = {}) {
  if (!menuItem || !menuItem.id) return { synced: false, action: 'skipped', reason: 'invalid_menu_item' };
  const rawIngredients = (menuItem.recipe || [])
    .filter((r) => r && r.inventory_item_id && Number(r.quantity_needed) > 0)
    .map((r) => ({
      inventory_item_id: r.inventory_item_id,
      inventory_item_name: r.inventory_item_name || '',
      category_id: r.category_id || '',
      quantity_needed: Number(r.quantity_needed) || 0,
      unit: r.unit || '',
    }));

  const targetBranchId = menuItem.branch_id || context.branch_id || null;
  const targetBranchName = menuItem.branch_name || context.branch_name || null;

  // Find existing linked manufacturing recipe WITHIN the same targetBranchId
  let existingRecipe = null;
  if (menuItem.manufacturing_recipe_id) {
    const candidate = await svc.entities.Recipe.get(menuItem.manufacturing_recipe_id).catch(() => null);
    if (candidate && (!targetBranchId || !candidate.branch_id || candidate.branch_id === targetBranchId)) {
      existingRecipe = candidate;
    }
  }
  if (!existingRecipe && context.recipesByMenuId) {
    const candidate = context.recipesByMenuId.get(menuItem.id) || null;
    if (candidate && (!targetBranchId || !candidate.branch_id || candidate.branch_id === targetBranchId)) {
      existingRecipe = candidate;
    }
  }
  if (!existingRecipe) {
    const byMenu = await svc.entities.Recipe.filter({ menu_item_id: menuItem.id });
    existingRecipe = (byMenu || []).find((r) => !targetBranchId || !r.branch_id || r.branch_id === targetBranchId) || null;
  }
  if (!existingRecipe) {
    const allRecipes = context.allRecipes || await svc.entities.Recipe.filter({});
    existingRecipe = allRecipes.find(
      (r) => norm(r.name) === norm(menuItem.name) && (!targetBranchId || r.branch_id === targetBranchId)
    ) || null;
  }

  // If the menu item has no recipe ingredients, deactivate any linked manufacturing recipe
  if (rawIngredients.length === 0) {
    if (existingRecipe && existingRecipe.status !== 'inactive') {
      await svc.entities.Recipe.update(existingRecipe.id, {
        status: 'inactive',
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name || '',
        recipe_source: 'menu_item',
        last_synced_at: new Date().toISOString(),
        total_cost: 0,
      });
    }
    if (Number(menuItem.total_cost) !== 0) {
      await svc.entities.MenuItem.update(menuItem.id, { total_cost: 0 });
    }
    return { synced: false, action: 'skipped', deactivated: !!existingRecipe, recipe: existingRecipe, total_cost: 0 };
  }

  // Load inventory items and unit conversion rules for costing and output item resolution
  const allInv = context.allInv || await svc.entities.InventoryItem.list('-created_date', 1000);
  const invById = context.invById || new Map(allInv.map((i) => [i.id, i]));
  const unitRules = context.unitRules || await loadConversionRules(svc);

  // If the menu item's single ingredient is already the output of a standalone manufacturing recipe,
  // link to it without overwriting its raw sub-ingredients with the output item itself.
  if (
    rawIngredients.length === 1 &&
    existingRecipe &&
    existingRecipe.output_item_id === rawIngredients[0].inventory_item_id &&
    (existingRecipe.ingredients || []).length > 0 &&
    !existingRecipe.ingredients.some((i) => i.inventory_item_id === existingRecipe.output_item_id)
  ) {
    const singleIng = rawIngredients[0];
    const inv = invById.get(singleIng.inventory_item_id);
    const subCostPerUnit = (Number(existingRecipe.total_cost) || 0) / (Number(existingRecipe.output_quantity) || 1);
    const resolvedUnit = singleIng.unit || getItemStockUnit(inv) || 'piece';
    const costRes = computeIngredientCost(singleIng.quantity_needed, resolvedUnit, inv, unitRules, subCostPerUnit);
    const singleTotalCost = round(
      costRes.ok
        ? costRes.totalCost
        : (Number(inv?.cost_per_unit) || subCostPerUnit || 0) * singleIng.quantity_needed
    );
    const now = new Date().toISOString();
    const updated = await svc.entities.Recipe.update(existingRecipe.id, {
      menu_item_id: menuItem.id,
      menu_item_name: menuItem.name || '',
      recipe_source: 'menu_item',
      branch_id: existingRecipe.branch_id || targetBranchId || null,
      branch_name: existingRecipe.branch_name || targetBranchName || null,
      last_synced_at: now,
    });
    await svc.entities.MenuItem.update(menuItem.id, {
      total_cost: singleTotalCost,
      manufacturing_recipe_id: existingRecipe.id,
      output_inventory_item_id: existingRecipe.output_item_id,
    });
    return { synced: true, action: 'updated', recipe: updated, output_item_id: existingRecipe.output_item_id, total_cost: singleTotalCost };
  }

  // Resolve or create the finished-product InventoryItem for this recipe's output
  let outputItemId = existingRecipe?.output_item_id || menuItem.output_inventory_item_id || '';
  let outputItem = outputItemId ? invById.get(outputItemId) : null;

  const ingredientIds = new Set(rawIngredients.map((i) => i.inventory_item_id));
  if (!outputItem || ingredientIds.has(outputItem.id) || (targetBranchId && outputItem.branch_id && outputItem.branch_id !== targetBranchId)) {
    outputItem = allInv.find(
      (i) => norm(i.name) === norm(menuItem.name) && !ingredientIds.has(i.id) && (!targetBranchId || i.branch_id === targetBranchId)
    ) || null;
  }

  // Calculate total batch cost from raw ingredients using unit-converted cost
  let totalCost = 0;
  const normalizedIngredients = rawIngredients.map((ing) => {
    const inv = invById.get(ing.inventory_item_id);
    const resolvedUnit = ing.unit || getItemStockUnit(inv) || 'piece';
    const costRes = computeIngredientCost(ing.quantity_needed, resolvedUnit, inv, unitRules);
    if (costRes.ok) {
      totalCost += costRes.totalCost;
    } else {
      // Fallback if no conversion rule exists yet
      const unitCost = Number(inv?.cost_per_unit) || 0;
      totalCost += unitCost * ing.quantity_needed;
    }
    return {
      inventory_item_id: ing.inventory_item_id,
      inventory_item_name: ing.inventory_item_name || inv?.name || '',
      quantity_needed: ing.quantity_needed,
      unit: resolvedUnit,
    };
  });
  totalCost = round(totalCost);

  if (!outputItem) {
    const today = new Date();
    today.setFullYear(today.getFullYear() + 1);
    // Dishes need an inventory category, or their production cannot post to finished goods.
    const [dishCategory] = await svc.entities.InventoryCategory.filter({ dish_output_default: true }, '-created_date', 1);
    outputItem = await svc.entities.InventoryItem.create({
      branch_id: targetBranchId || undefined,
      branch_name: targetBranchName || undefined,
      name: menuItem.name,
      category_id: dishCategory?.id || undefined,
      category_name: dishCategory?.name || menuItem.category || 'Prepared Menu Items',
      quantity: 0,
      unit: 'portion',
      purchase_unit: 'pcs',
      purchase_unit_label: 'portion',
      selling_unit: 'pcs',
      selling_unit_label: 'portion',
      low_stock_threshold: 0,
      cost_per_unit: totalCost,
      expiry_date: today.toISOString().slice(0, 10),
    });
    invById.set(outputItem.id, outputItem);
    allInv.push(outputItem);
  } else {
    const itemUpdates = {};
    if (totalCost > 0 && Number(outputItem.cost_per_unit) !== totalCost) {
      itemUpdates.cost_per_unit = totalCost;
    }
    if (!outputItem.branch_id && targetBranchId) {
      itemUpdates.branch_id = targetBranchId;
      itemUpdates.branch_name = targetBranchName || undefined;
    }
    if (Object.keys(itemUpdates).length > 0) {
      outputItem = await svc.entities.InventoryItem.update(outputItem.id, itemUpdates);
      invById.set(outputItem.id, outputItem);
    }
  }

  const now = new Date().toISOString();
  const recipePayload = {
    name: menuItem.name,
    description: menuItem.description || existingRecipe?.description || `Synced from menu item ${menuItem.name}`,
    menu_item_id: menuItem.id,
    menu_item_name: menuItem.name,
    recipe_source: 'menu_item',
    last_synced_at: now,
    output_item_id: outputItem.id,
    output_item_name: outputItem.name,
    output_quantity: existingRecipe?.output_quantity || 1,
    output_unit: existingRecipe?.output_unit || outputItem.selling_unit_label || outputItem.unit || 'portion',
    ingredients: normalizedIngredients,
    branch_id: menuItem.branch_id || existingRecipe?.branch_id || targetBranchId || null,
    branch_name: menuItem.branch_name || existingRecipe?.branch_name || targetBranchName || null,
    status: menuItem.available === false ? 'inactive' : 'active',
    total_cost: totalCost,
  };

  let savedRecipe;
  let action;
  if (existingRecipe) {
    savedRecipe = await svc.entities.Recipe.update(existingRecipe.id, recipePayload);
    action = 'updated';
  } else {
    savedRecipe = await svc.entities.Recipe.create({
      ...recipePayload,
      created_by: userEmail || '',
    });
    action = 'created';
  }

  await svc.entities.MenuItem.update(menuItem.id, {
    total_cost: totalCost,
    manufacturing_recipe_id: savedRecipe.id,
    output_inventory_item_id: outputItem.id,
  });

  return { synced: true, action, recipe: savedRecipe, output_item_id: outputItem.id, total_cost: totalCost };
}