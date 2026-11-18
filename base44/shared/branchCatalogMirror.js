import { buildBranchInventoryMatcher } from './branchInventoryTransfer.js';
import { syncMenuRecipeToManufacturing } from './menuRecipeSync.js';
import { loadConversionRules } from './unitConversion.js';
import { buildUnitRows } from './equipmentUnits.js';

const norm = (s) => String(s || '').trim().toLowerCase();

const INVENTORY_MIRROR_FIELDS = [
  'name',
  'arabic_name',
  'category_id',
  'category_name',
  'unit',
  'purchase_unit',
  'purchase_unit_label',
  'selling_unit',
  'selling_unit_label',
  'low_stock_threshold',
  'cost_per_unit',
  'supplier_id',
  'supplier',
  'lead_time_days',
  'expiry_date',
];

/**
 * Build zero-stock counterpart payloads for an InventoryItem across all other active branches.
 * Stock quantity is ALWAYS 0 in target branches, and subsequent edits to quantity or traits
 * remain strictly independent per branch.
 */
export function planInventoryItemMirrors({
  sourceItem,
  branches = [],
  allInventoryItems = [],
  storageLocations = [],
}) {
  if (!sourceItem?.id || !sourceItem?.name) return [];
  const sourceBranchId = sourceItem.branch_id || null;
  const familyId = sourceItem.source_item_id || sourceItem.id;

  const sourceLocName =
    sourceItem.storage_location_name ||
    storageLocations.find((l) => l.id === sourceItem.storage_location_id)?.name ||
    '';

  const mirrorsToCreate = [];

  for (const branch of branches) {
    if (!branch?.id || branch.is_active === false) continue;
    if (sourceBranchId && branch.id === sourceBranchId) continue;

    const branchItems = allInventoryItems.filter(
      (i) => i.branch_id === branch.id && i.is_active !== false
    );
    const matcher = buildBranchInventoryMatcher(branchItems);
    const match = matcher.resolve({
      id: sourceItem.id,
      source_item_id: familyId,
      name: sourceItem.name,
      category_id: sourceItem.category_id,
    });

    if (match.status === 'matched' || match.status === 'ambiguous') {
      continue;
    }

    const matchedLoc = sourceLocName
      ? storageLocations.find(
          (l) => l.branch_id === branch.id && norm(l.name) === norm(sourceLocName)
        )
      : null;

    const payload = {
      branch_id: branch.id,
      branch_name: branch.name || '',
      quantity: 0,
      source_item_id: familyId,
    };

    for (const key of INVENTORY_MIRROR_FIELDS) {
      if (sourceItem[key] !== undefined && sourceItem[key] !== null && sourceItem[key] !== '') {
        payload[key] = sourceItem[key];
      }
    }
    if (!payload.expiry_date) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      payload.expiry_date = nextYear.toISOString().slice(0, 10);
    }
    if (matchedLoc) {
      payload.storage_location_id = matchedLoc.id;
      payload.storage_location_name = matchedLoc.name;
    }

    mirrorsToCreate.push({
      branch_id: branch.id,
      branch_name: branch.name,
      payload,
    });
  }

  return mirrorsToCreate;
}

/**
 * Map a recipe ingredient array from a source branch to a target branch's own InventoryItems.
 */
export function mapIngredientsToBranch(ingredients = [], allById, targetBranchMatcher) {
  const mapped = [];
  const unresolved = [];

  for (let idx = 0; idx < (ingredients || []).length; idx++) {
    const ing = ingredients[idx];
    if (!ing?.inventory_item_id) continue;
    const srcInv = allById.get(ing.inventory_item_id);
    const res = targetBranchMatcher.resolve({
      id: ing.inventory_item_id,
      source_item_id: srcInv?.source_item_id || srcInv?.id,
      name: ing.inventory_item_name || srcInv?.name,
      category_id: ing.category_id || srcInv?.category_id,
    });
    if (res.status === 'matched' && res.item) {
      mapped.push({
        ...ing,
        inventory_item_id: res.item.id,
        inventory_item_name: res.item.name || ing.inventory_item_name || '',
        ...(ing.category_id || res.item.category_id
          ? { category_id: res.item.category_id || ing.category_id }
          : {}),
      });
    } else {
      mapped.push(ing);
      unresolved.push({
        index: idx,
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name: ing.inventory_item_name || srcInv?.name || '',
        status: res.status,
      });
    }
  }

  return { mapped, unresolved };
}

/**
 * Mirrors an InventoryItem across all other active branches (idempotent).
 */
export async function mirrorInventoryItemAcrossBranches(svc, itemOrItems, context = {}) {
  const items = (Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]).filter((i) => i && i.id);
  if (!items.length) return { created_count: 0, created_items: [] };

  const [branches, allInventoryItems, storageLocations] = await Promise.all([
    context.branches ? Promise.resolve(context.branches) : svc.entities.Branch.list('created_date', 100),
    context.allInventoryItems
      ? Promise.resolve(context.allInventoryItems)
      : svc.entities.InventoryItem.list('-created_date', 1000),
    context.storageLocations
      ? Promise.resolve(context.storageLocations)
      : svc.entities.StorageLocation.list(),
  ]);

  const payloads = [];
  const workingInv = [...allInventoryItems];

  for (const srcItem of items) {
    const plans = planInventoryItemMirrors({
      sourceItem: srcItem,
      branches,
      allInventoryItems: workingInv,
      storageLocations,
    });
    for (const p of plans) {
      payloads.push(p.payload);
      workingInv.push({ ...p.payload, id: `__planned__:${srcItem.id}:${p.branch_id}` });
    }
  }

  const createdItems = [];
  for (let i = 0; i < payloads.length; i += 500) {
    const batch = payloads.slice(i, i + 500);
    if (svc.entities.InventoryItem.bulkCreate) {
      const res = await svc.entities.InventoryItem.bulkCreate(batch);
      if (Array.isArray(res)) createdItems.push(...res);
    } else {
      for (const row of batch) {
        createdItems.push(await svc.entities.InventoryItem.create(row));
      }
    }
  }

  return {
    created_count: createdItems.length,
    created_items: createdItems,
  };
}

/**
 * Mirrors a MenuItem (and its recipe + manufacturing recipe) across all other active branches.
 * Each branch gets its own distinct MenuItem record, its own Recipe record, and its own
 * output InventoryItem, with ingredients mapped to that branch's InventoryItem twins.
 */
export async function mirrorMenuItemAcrossBranches(svc, sourceMenuItem, userEmail = '', context = {}) {
  if (!sourceMenuItem?.id || !sourceMenuItem?.name) {
    return { created_count: 0, updated_count: 0, mirrors: [] };
  }

  const [branches, allMenuItems, allInv, allRecipes, unitRules] = await Promise.all([
    context.branches ? Promise.resolve(context.branches) : svc.entities.Branch.list('created_date', 100),
    context.allMenuItems ? Promise.resolve(context.allMenuItems) : svc.entities.MenuItem.list('-created_date', 1000),
    context.allInv ? Promise.resolve(context.allInv) : svc.entities.InventoryItem.list('-created_date', 1000),
    context.allRecipes ? Promise.resolve(context.allRecipes) : svc.entities.Recipe.list('-created_date', 1000),
    context.unitRules ? Promise.resolve(context.unitRules) : loadConversionRules(svc),
  ]);

  const allById = new Map(allInv.map((i) => [i.id, i]));
  const sourceBranchId = sourceMenuItem.branch_id || null;
  let createdCount = 0;
  let updatedCount = 0;
  const mirrors = [];

  for (const branch of branches) {
    if (!branch?.id || branch.is_active === false) continue;
    if (sourceBranchId && branch.id === sourceBranchId) continue;

    const branchInv = allInv.filter((i) => i.branch_id === branch.id && i.is_active !== false);
    const matcher = buildBranchInventoryMatcher(branchInv);

    const { mapped: mappedRecipe } = mapIngredientsToBranch(
      sourceMenuItem.recipe || [],
      allById,
      matcher
    );

    let mappedSizeRecipes = undefined;
    if (sourceMenuItem.size_recipes && typeof sourceMenuItem.size_recipes === 'object') {
      mappedSizeRecipes = {};
      for (const [sizeName, sizeIngs] of Object.entries(sourceMenuItem.size_recipes)) {
        mappedSizeRecipes[sizeName] = mapIngredientsToBranch(
          Array.isArray(sizeIngs) ? sizeIngs : [],
          allById,
          matcher
        ).mapped;
      }
    }

    let targetMenu = allMenuItems.find(
      (m) => m.branch_id === branch.id && norm(m.name) === norm(sourceMenuItem.name)
    );

    if (!targetMenu) {
      const createPayload = {
        branch_id: branch.id,
        branch_name: branch.name || '',
        name: sourceMenuItem.name,
        description: sourceMenuItem.description || '',
        price: Number(sourceMenuItem.price) || 0,
        ...(sourceMenuItem.indirect_price != null ? { indirect_price: Number(sourceMenuItem.indirect_price) } : {}),
        ...(sourceMenuItem.image_url ? { image_url: sourceMenuItem.image_url } : {}),
        category: sourceMenuItem.category || '',
        available: sourceMenuItem.available !== false,
        preparation_station: sourceMenuItem.preparation_station || 'kitchen',
        recipe: mappedRecipe,
        ...(mappedSizeRecipes ? { size_recipes: mappedSizeRecipes } : {}),
        ...(Array.isArray(sourceMenuItem.sizes) && sourceMenuItem.sizes.length
          ? { sizes: sourceMenuItem.sizes }
          : {}),
        visible_website: sourceMenuItem.visible_website !== false,
        visible_pos: sourceMenuItem.visible_pos !== false,
        tax_exempt: Boolean(sourceMenuItem.tax_exempt),
        service_exempt: Boolean(sourceMenuItem.service_exempt),
        target_margin_percentage: Number(sourceMenuItem.target_margin_percentage) || 0,
        total_cost: Number(sourceMenuItem.total_cost) || 0,
      };
      targetMenu = await svc.entities.MenuItem.create(createPayload);
      allMenuItems.push(targetMenu);
      createdCount += 1;
    } else if (mappedRecipe.length > 0 && (!targetMenu.recipe || targetMenu.recipe.length === 0)) {
      targetMenu = await svc.entities.MenuItem.update(targetMenu.id, {
        recipe: mappedRecipe,
        ...(mappedSizeRecipes ? { size_recipes: mappedSizeRecipes } : {}),
      });
      updatedCount += 1;
    }

    if (mappedRecipe.length > 0 && targetMenu?.id) {
      await syncMenuRecipeToManufacturing(svc, targetMenu, userEmail, {
        branch_id: branch.id,
        branch_name: branch.name,
        allInv,
        invById: allById,
        allRecipes,
        unitRules,
      });
    }

    mirrors.push({ branch_id: branch.id, branch_name: branch.name, menu_item_id: targetMenu.id });
  }

  return { created_count: createdCount, updated_count: updatedCount, mirrors };
}

/**
 * Mirrors a standalone Manufacturing Recipe across all other active branches.
 */
export async function mirrorStandaloneRecipeAcrossBranches(svc, sourceRecipe, userEmail = '', context = {}) {
  if (!sourceRecipe?.id || !sourceRecipe?.name) {
    return { created_count: 0, mirrors: [] };
  }

  const [branches, allInv, allRecipes] = await Promise.all([
    context.branches ? Promise.resolve(context.branches) : svc.entities.Branch.list('created_date', 100),
    context.allInv ? Promise.resolve(context.allInv) : svc.entities.InventoryItem.list('-created_date', 1000),
    context.allRecipes ? Promise.resolve(context.allRecipes) : svc.entities.Recipe.list('-created_date', 1000),
  ]);

  const allById = new Map(allInv.map((i) => [i.id, i]));
  const sourceBranchId = sourceRecipe.branch_id || null;
  let createdCount = 0;
  const mirrors = [];

  for (const branch of branches) {
    if (!branch?.id || branch.is_active === false) continue;
    if (sourceBranchId && branch.id === sourceBranchId) continue;

    const existing = allRecipes.find(
      (r) => r.branch_id === branch.id && norm(r.name) === norm(sourceRecipe.name)
    );
    if (existing) continue;

    const branchInv = allInv.filter((i) => i.branch_id === branch.id && i.is_active !== false);
    const matcher = buildBranchInventoryMatcher(branchInv);

    const srcOutput = allById.get(sourceRecipe.output_item_id);
    const outMatch = matcher.resolve({
      id: sourceRecipe.output_item_id,
      source_item_id: srcOutput?.source_item_id || srcOutput?.id,
      name: sourceRecipe.output_item_name || srcOutput?.name || sourceRecipe.name,
      category_id: srcOutput?.category_id,
    });

    let targetOutputItem = outMatch.item;
    if (!targetOutputItem) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      targetOutputItem = await svc.entities.InventoryItem.create({
        branch_id: branch.id,
        branch_name: branch.name || '',
        name: sourceRecipe.output_item_name || srcOutput?.name || sourceRecipe.name,
        category_id: srcOutput?.category_id || undefined,
        category_name: srcOutput?.category_name || 'Prepared Menu Items',
        quantity: 0,
        unit: sourceRecipe.output_unit || srcOutput?.unit || 'portion',
        purchase_unit: srcOutput?.purchase_unit || 'pcs',
        purchase_unit_label: srcOutput?.purchase_unit_label || sourceRecipe.output_unit || 'portion',
        selling_unit: srcOutput?.selling_unit || 'pcs',
        selling_unit_label: srcOutput?.selling_unit_label || sourceRecipe.output_unit || 'portion',
        low_stock_threshold: Number(srcOutput?.low_stock_threshold) || 0,
        cost_per_unit: Number(srcOutput?.cost_per_unit) || Number(sourceRecipe.total_cost) || 0,
        source_item_id: srcOutput?.source_item_id || srcOutput?.id || undefined,
        expiry_date: nextYear.toISOString().slice(0, 10),
      });
      allInv.push(targetOutputItem);
      allById.set(targetOutputItem.id, targetOutputItem);
    }

    const { mapped: mappedIngs } = mapIngredientsToBranch(
      sourceRecipe.ingredients || [],
      allById,
      matcher
    );

    const createdRecipe = await svc.entities.Recipe.create({
      name: sourceRecipe.name,
      description: sourceRecipe.description || '',
      recipe_source: sourceRecipe.recipe_source || 'manufacturing',
      output_item_id: targetOutputItem.id,
      output_item_name: targetOutputItem.name,
      output_quantity: Number(sourceRecipe.output_quantity) || 1,
      output_unit: sourceRecipe.output_unit || targetOutputItem.unit || 'portion',
      ingredients: mappedIngs,
      ...(sourceRecipe.product_owner_id
        ? {
            product_owner_id: sourceRecipe.product_owner_id,
            product_owner_name: sourceRecipe.product_owner_name || '',
          }
        : {}),
      branch_id: branch.id,
      branch_name: branch.name || '',
      status: sourceRecipe.status || 'active',
      total_cost: Number(sourceRecipe.total_cost) || 0,
      created_by: userEmail || sourceRecipe.created_by || '',
      ...(sourceRecipe.notes ? { notes: sourceRecipe.notes } : {}),
    });

    allRecipes.push(createdRecipe);
    createdCount += 1;
    mirrors.push({ branch_id: branch.id, branch_name: branch.name, recipe_id: createdRecipe.id });
  }

  return { created_count: createdCount, mirrors };
}

/**
 * Copies CateringEquipment and/or CateringVehicle definitions from an authorized sourceBranch
 * into an authorized targetBranch. Skips items that already exist by name in targetBranch.
 */
export async function copyBranchEquipmentAndVehicles(svc, {
  sourceBranch,
  targetBranch,
  assetTypes = ['equipment', 'vehicles'],
  equipmentIds = null,
  vehicleIds = null,
}) {
  const wantEquipment = assetTypes.includes('equipment');
  const wantVehicles = assetTypes.includes('vehicles');

  let copiedEquipmentCount = 0;
  let skippedEquipmentCount = 0;
  let copiedVehiclesCount = 0;
  let skippedVehiclesCount = 0;

  if (wantEquipment) {
    const [allEq, allUnits] = await Promise.all([
      svc.entities.CateringEquipment.list('-created_date', 1000),
      svc.entities.CateringEquipmentUnit.list('-created_date', 3000),
    ]);
    const idFilter = Array.isArray(equipmentIds) && equipmentIds.length ? new Set(equipmentIds) : null;
    const sourceEq = allEq.filter(
      (e) =>
        e.is_active !== false &&
        (e.home_branch_id === sourceBranch.id || (!e.home_branch_id && sourceBranch.is_default)) &&
        (!idFilter || idFilter.has(e.id))
    );
    const targetNames = new Set(
      allEq
        .filter((e) => e.home_branch_id === targetBranch.id && e.is_active !== false)
        .map((e) => norm(e.name))
    );

    for (const eq of sourceEq) {
      if (targetNames.has(norm(eq.name))) {
        skippedEquipmentCount += 1;
        continue;
      }
      const created = await svc.entities.CateringEquipment.create({
        name: eq.name,
        category: eq.category || 'Other',
        tracking_mode: eq.tracking_mode || 'bulk',
        total_quantity: Number(eq.total_quantity) || 0,
        unit_label: eq.unit_label || 'pcs',
        purchase_date: eq.purchase_date || '',
        purchase_cost: Number(eq.purchase_cost) || 0,
        useful_life_years: Number(eq.useful_life_years) || 0,
        salvage_value_percentage: Number(eq.salvage_value_percentage) || 0,
        home_branch_id: targetBranch.id,
        home_branch_name: targetBranch.name || '',
        storage_location: eq.storage_location || '',
        requires_vehicle: Boolean(eq.requires_vehicle),
        usage_cost_per_event: Number(eq.usage_cost_per_event) || 0,
        cost_source: eq.cost_source || 'owned',
        replacement_cost: Number(eq.replacement_cost) || 0,
        is_active: true,
        notes: eq.notes || '',
      });
      targetNames.add(norm(eq.name));
      copiedEquipmentCount += 1;

      if (eq.tracking_mode === 'unit') {
        const srcUnits = allUnits.filter((u) => u.equipment_id === eq.id);
        const unitCount = Math.min(srcUnits.length || Number(eq.total_quantity) || 0, 500);
        if (unitCount > 0) {
          const unitRows = buildUnitRows(created, unitCount, { purchaseDate: eq.purchase_date || '' });
          if (unitRows.length > 0 && svc.entities.CateringEquipmentUnit.bulkCreate) {
            await svc.entities.CateringEquipmentUnit.bulkCreate(unitRows);
          }
        }
      }
    }
  }

  if (wantVehicles) {
    const allVehicles = await svc.entities.CateringVehicle.list('-created_date', 500);
    const idFilter = Array.isArray(vehicleIds) && vehicleIds.length ? new Set(vehicleIds) : null;
    const sourceVehicles = allVehicles.filter(
      (v) =>
        v.status !== 'retired' &&
        (v.home_branch_id === sourceBranch.id || (!v.home_branch_id && sourceBranch.is_default)) &&
        (!idFilter || idFilter.has(v.id))
    );
    const targetVehicleNames = new Set(
      allVehicles
        .filter((v) => v.home_branch_id === targetBranch.id)
        .map((v) => norm(v.name))
    );

    for (const v of sourceVehicles) {
      if (targetVehicleNames.has(norm(v.name))) {
        skippedVehiclesCount += 1;
        continue;
      }
      await svc.entities.CateringVehicle.create({
        name: v.name,
        plate_number: v.plate_number || '',
        vehicle_type: v.vehicle_type || 'van',
        capacity_notes: v.capacity_notes || '',
        home_branch_id: targetBranch.id,
        home_branch_name: targetBranch.name || '',
        status: v.status || 'available',
        cost_basis: v.cost_basis || 'per_km',
        cost_per_km: Number(v.cost_per_km) || 0,
        cost_per_day: Number(v.cost_per_day) || 0,
        notes: v.notes || '',
      });
      targetVehicleNames.add(norm(v.name));
      copiedVehiclesCount += 1;
    }
  }

  return {
    copied_equipment_count: copiedEquipmentCount,
    skipped_equipment_count: skippedEquipmentCount,
    copied_vehicles_count: copiedVehiclesCount,
    skipped_vehicles_count: skippedVehiclesCount,
  };
}