const norm = (v) => String(v || '').trim().toLowerCase();

export function buildBranchInventoryMatcher(branchItems = []) {
  const byId = new Map();
  const bySourceId = new Map();
  const byNameAndCat = new Map();
  const byName = new Map();

  for (const item of branchItems) {
    if (!item?.id) continue;
    byId.set(item.id, item);

    if (item.source_item_id) {
      const prev = bySourceId.get(item.source_item_id) || [];
      bySourceId.set(item.source_item_id, [...prev, item]);
    }

    const nameKey = norm(item.name);
    if (!nameKey) continue;

    const catKey = `${nameKey}::${norm(item.category_id)}`;
    const prevCat = byNameAndCat.get(catKey) || [];
    byNameAndCat.set(catKey, [...prevCat, item]);

    const prevName = byName.get(nameKey) || [];
    byName.set(nameKey, [...prevName, item]);
  }

  const resolve = ({ id, source_item_id, name, category_id }) => {
    if (id && byId.has(id)) {
      return {
        status: 'matched',
        item: byId.get(id),
        candidates: [byId.get(id)],
        matchMethod: 'same_record_id',
      };
    }

    if (id && bySourceId.has(id)) {
      const list = bySourceId.get(id);
      if (list.length === 1) {
        return {
          status: 'matched',
          item: list[0],
          candidates: list,
          matchMethod: 'source_item_id',
        };
      }
      if (list.length > 1) {
        return { status: 'ambiguous', item: null, candidates: list, matchMethod: 'source_item_id' };
      }
    }

    if (source_item_id && bySourceId.has(source_item_id)) {
      const list = bySourceId.get(source_item_id);
      if (list.length === 1) {
        return {
          status: 'matched',
          item: list[0],
          candidates: list,
          matchMethod: 'source_item_id',
        };
      }
      if (list.length > 1) {
        return { status: 'ambiguous', item: null, candidates: list, matchMethod: 'source_item_id' };
      }
    }

    if (source_item_id && byId.has(source_item_id)) {
      const target = byId.get(source_item_id);
      return {
        status: 'matched',
        item: target,
        candidates: [target],
        matchMethod: 'source_item_id',
      };
    }

    const nameKey = norm(name);
    if (!nameKey) {
      return { status: 'unmatched', item: null, candidates: [], matchMethod: 'none' };
    }

    if (category_id) {
      const catKey = `${nameKey}::${norm(category_id)}`;
      const catMatches = byNameAndCat.get(catKey) || [];
      if (catMatches.length === 1) {
        return {
          status: 'matched',
          item: catMatches[0],
          candidates: catMatches,
          matchMethod: 'name_and_category',
        };
      }
      if (catMatches.length > 1) {
        return {
          status: 'ambiguous',
          item: null,
          candidates: catMatches,
          matchMethod: 'name_and_category',
        };
      }
    }

    const nameMatches = byName.get(nameKey) || [];
    if (nameMatches.length === 1) {
      return {
        status: 'matched',
        item: nameMatches[0],
        candidates: nameMatches,
        matchMethod: 'unique_name',
      };
    }
    if (nameMatches.length > 1) {
      return {
        status: 'ambiguous',
        item: null,
        candidates: nameMatches,
        matchMethod: 'duplicate_name',
      };
    }

    return { status: 'unmatched', item: null, candidates: [], matchMethod: 'none' };
  };

  return { byId, byName, byNameAndCat, resolve };
}

export function validateRecipeBranchIsolation(recipeRows = [], invById, effectiveBranchId, effectiveBranchName = '') {
  if (!effectiveBranchId) return { ok: true, violations: [] };
  const violations = [];
  for (let i = 0; i < (recipeRows || []).length; i++) {
    const row = recipeRows[i];
    if (!row?.inventory_item_id) continue;
    const inv = invById instanceof Map ? invById.get(row.inventory_item_id) : invById?.[row.inventory_item_id];
    if (!inv) {
      violations.push({
        index: i,
        inventory_item_id: row.inventory_item_id,
        inventory_item_name: row.inventory_item_name || 'Unknown ingredient',
        reason: `Ingredient "${row.inventory_item_name || row.inventory_item_id}" does not exist in inventory.`,
      });
      continue;
    }
    if (inv.branch_id !== effectiveBranchId) {
      const targetLabel = effectiveBranchName || effectiveBranchId;
      const otherLabel = inv.branch_name || inv.branch_id || 'unassigned';
      violations.push({
        index: i,
        inventory_item_id: row.inventory_item_id,
        inventory_item_name: inv.name || row.inventory_item_name || '',
        item_branch_id: inv.branch_id || null,
        item_branch_name: inv.branch_name || null,
        reason: `Ingredient "${inv.name || row.inventory_item_name}" belongs to branch "${otherLabel}" instead of "${targetLabel}".`,
      });
    }
  }
  return {
    ok: violations.length === 0,
    violations,
  };
}

export function buildBranchTransferPlan({
  sourceBranch,
  targetBranch,
  inventoryItems = [],
  storageLocations = [],
  menuItems = [],
  recipes = [],
}) {
  if (!sourceBranch?.id || !targetBranch?.id || sourceBranch.id === targetBranch.id) {
    return null;
  }

  const allById = new Map(inventoryItems.map((i) => [i.id, i]));
  const sourceActiveItems = inventoryItems.filter(
    (i) => i.branch_id === sourceBranch.id && i.is_active !== false
  );
  const existingTargetItems = inventoryItems.filter(
    (i) => i.branch_id === targetBranch.id && i.is_active !== false
  );

  const targetLocByName = new Map();
  for (const loc of storageLocations) {
    if (loc.branch_id === targetBranch.id && loc.name) {
      targetLocByName.set(norm(loc.name), loc);
    }
  }
  const sourceLocById = new Map();
  for (const loc of storageLocations) {
    if (loc.id) sourceLocById.set(loc.id, loc);
  }

  const existingTargetMatcher = buildBranchInventoryMatcher(existingTargetItems);

  const itemsToCopy = [];
  const itemsAlreadyInTarget = [];
  const ambiguousInventoryItems = [];
  const sourceToTargetIdMap = new Map();

  for (const srcItem of sourceActiveItems) {
    const match = existingTargetMatcher.resolve({
      id: srcItem.id,
      source_item_id: srcItem.source_item_id,
      name: srcItem.name,
      category_id: srcItem.category_id,
    });

    if (match.status === 'matched' && match.item) {
      itemsAlreadyInTarget.push({
        sourceItem: srcItem,
        targetItem: match.item,
        matchMethod: match.matchMethod,
      });
      sourceToTargetIdMap.set(srcItem.id, match.item.id);
      continue;
    }

    if (match.status === 'ambiguous') {
      ambiguousInventoryItems.push({
        sourceItem: srcItem,
        candidates: match.candidates,
        reason: `Multiple items named "${srcItem.name}" already exist in ${targetBranch.name}`,
      });
      continue;
    }

    const srcLocName =
      srcItem.storage_location_name ||
      sourceLocById.get(srcItem.storage_location_id)?.name ||
      '';
    const matchedTargetLoc = srcLocName ? targetLocByName.get(norm(srcLocName)) : null;

    // Code a new destination-branch item definition with zero stock (never moves source item or its stock)
    const createPayload = {
      branch_id: targetBranch.id,
      branch_name: targetBranch.name,
      name: srcItem.name,
      ...(srcItem.arabic_name ? { arabic_name: srcItem.arabic_name } : {}),
      ...(srcItem.category_id ? { category_id: srcItem.category_id } : {}),
      ...(srcItem.category_name ? { category_name: srcItem.category_name } : {}),
      quantity: 0,
      unit: srcItem.unit || 'pcs',
      purchase_unit: srcItem.purchase_unit || srcItem.unit || 'pcs',
      purchase_unit_label: srcItem.purchase_unit_label || srcItem.unit || 'pcs',
      selling_unit: srcItem.selling_unit || srcItem.unit || 'pcs',
      selling_unit_label: srcItem.selling_unit_label || srcItem.unit || 'pcs',
      low_stock_threshold: Number(srcItem.low_stock_threshold) || 0,
      cost_per_unit: Number(srcItem.cost_per_unit) || 0,
      ...(srcItem.supplier_id ? { supplier_id: srcItem.supplier_id } : {}),
      ...(srcItem.supplier ? { supplier: srcItem.supplier } : {}),
      ...(srcItem.lead_time_days != null ? { lead_time_days: Number(srcItem.lead_time_days) || 0 } : {}),
      ...(matchedTargetLoc
        ? {
            storage_location_id: matchedTargetLoc.id,
            storage_location_name: matchedTargetLoc.name,
          }
        : {}),
      source_item_id: srcItem.source_item_id || srcItem.id,
      is_active: true,
    };

    const plannedId = `__planned_copy__:${srcItem.id}`;
    const plannedTargetItem = {
      ...createPayload,
      id: plannedId,
    };

    itemsToCopy.push({
      sourceItem: srcItem,
      createPayload,
      plannedTargetItem,
      targetStorageLocationName: matchedTargetLoc?.name || null,
    });
    sourceToTargetIdMap.set(srcItem.id, plannedId);
  }

  const postTransferTargetItems = [
    ...existingTargetItems,
    ...itemsToCopy.map((c) => c.plannedTargetItem),
  ];
  const postTransferMatcher = buildBranchInventoryMatcher(postTransferTargetItems);

  // Inspect menu items for targetBranch or shared (never alter menu items owned by sourceBranch)
  const candidateMenuItems = menuItems.filter(
    (m) => !m.branch_id || m.branch_id === targetBranch.id
  );
  const preservedSourceMenuItems = menuItems.filter(
    (m) => m.branch_id === sourceBranch.id
  );

  const menuUpdates = [];
  const recipeLinkDetails = [];
  const unresolvedRecipeLinks = [];
  let alreadyLinkedMenusCount = 0;
  let alreadyLinkedIngredientsCount = 0;

  for (const menuItem of candidateMenuItems) {
    const rawRecipe = Array.isArray(menuItem.recipe) ? menuItem.recipe : [];
    if (rawRecipe.length === 0) continue;

    let menuNeedsRecordUpdate = false;
    let menuHasMovedOrRelinked = false;
    let menuAllAlreadyInTarget = true;
    const nextRecipe = [];

    for (let idx = 0; idx < rawRecipe.length; idx++) {
      const ing = rawRecipe[idx];
      const currentInv = allById.get(ing.inventory_item_id);
      const isFromSourceBranch =
        currentInv?.branch_id === sourceBranch.id ||
        (!currentInv && Boolean(ing.inventory_item_id));

      if (currentInv && currentInv.branch_id === targetBranch.id) {
        alreadyLinkedIngredientsCount += 1;
        nextRecipe.push(ing);
        continue;
      }
      menuAllAlreadyInTarget = false;

      const mappedTargetId = sourceToTargetIdMap.get(ing.inventory_item_id);
      const directTargetItem = mappedTargetId
        ? postTransferMatcher.byId.get(mappedTargetId)
        : null;

      const resolution = directTargetItem
        ? {
            status: 'matched',
            item: directTargetItem,
            candidates: [directTargetItem],
            matchMethod: String(directTargetItem.id).startsWith('__planned_copy__:')
              ? 'copied_to_target'
              : 'relinked_existing_target',
          }
        : postTransferMatcher.resolve({
            id: ing.inventory_item_id,
            source_item_id: currentInv?.source_item_id,
            name: ing.inventory_item_name || currentInv?.name,
            category_id: ing.category_id || currentInv?.category_id,
          });

      if (resolution.status === 'matched' && resolution.item) {
        const targetItem = resolution.item;
        const idChanged = targetItem.id !== ing.inventory_item_id;
        const metaChanged =
          (targetItem.name && ing.inventory_item_name !== targetItem.name) ||
          (targetItem.category_id && ing.category_id !== targetItem.category_id);

        if (idChanged || metaChanged) {
          menuNeedsRecordUpdate = true;
        }
        if (isFromSourceBranch || idChanged) {
          menuHasMovedOrRelinked = true;
        }

        const updatedIng = {
          ...ing,
          inventory_item_id: targetItem.id,
          inventory_item_name: targetItem.name || ing.inventory_item_name || '',
          category_id: targetItem.category_id || ing.category_id || '',
        };
        nextRecipe.push(updatedIng);

        recipeLinkDetails.push({
          menu_item_id: menuItem.id,
          menu_item_name: menuItem.name,
          ingredient_index: idx,
          old_inventory_item_id: ing.inventory_item_id,
          old_inventory_item_name: ing.inventory_item_name || currentInv?.name || '',
          new_inventory_item_id: targetItem.id,
          new_inventory_item_name: targetItem.name,
          category_id: targetItem.category_id || '',
          matchMethod: resolution.matchMethod,
          idChanged,
        });
      } else {
        nextRecipe.push(ing);
        unresolvedRecipeLinks.push({
          menu_item_id: menuItem.id,
          menu_item_name: menuItem.name,
          ingredient_index: idx,
          inventory_item_id: ing.inventory_item_id,
          inventory_item_name: ing.inventory_item_name || currentInv?.name || 'Unknown item',
          category_id: ing.category_id || currentInv?.category_id || '',
          status: resolution.status,
          reason:
            resolution.status === 'ambiguous'
              ? `Ambiguous match in ${targetBranch.name} (${resolution.candidates.length} candidates with same name)`
              : `No matching active inventory item found in ${targetBranch.name}`,
          candidates: (resolution.candidates || []).map((c) => ({
            id: c.id,
            name: c.name,
            category_name: c.category_name,
          })),
        });
      }
    }

    if (menuAllAlreadyInTarget) {
      alreadyLinkedMenusCount += 1;
    }

    if (menuNeedsRecordUpdate || menuHasMovedOrRelinked) {
      menuUpdates.push({
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        needsRecordWrite: menuNeedsRecordUpdate,
        nextRecipe,
      });
    }
  }

  // Build destination-branch manufacturing / menu-synced recipes without removing source-branch recipes
  const sourceOnlyMenuIds = new Set(preservedSourceMenuItems.map((m) => m.id));
  const targetRecipes = recipes.filter((r) => r.branch_id === targetBranch.id);
  const targetRecipeByMenuId = new Map();
  const targetRecipeByName = new Map();
  for (const tr of targetRecipes) {
    if (tr.menu_item_id && !targetRecipeByMenuId.has(tr.menu_item_id)) {
      targetRecipeByMenuId.set(tr.menu_item_id, tr);
    }
    if (tr.name && !targetRecipeByName.has(norm(tr.name))) {
      targetRecipeByName.set(norm(tr.name), tr);
    }
  }

  const recipesToCreate = [];
  const recipesToUpdate = [];
  const handledTargetRecipeIds = new Set();

  const mapRecipeToTarget = (rec) => {
    const nextIngredients = (rec.ingredients || []).map((ing) => {
      const mappedId = sourceToTargetIdMap.get(ing.inventory_item_id);
      const targetItem =
        (mappedId && postTransferMatcher.byId.get(mappedId)) ||
        postTransferMatcher.resolve({
          id: ing.inventory_item_id,
          name: ing.inventory_item_name,
        }).item;
      if (!targetItem) return ing;
      return {
        ...ing,
        inventory_item_id: targetItem.id,
        inventory_item_name: targetItem.name || ing.inventory_item_name,
      };
    });
    const mappedOutputItem =
      (sourceToTargetIdMap.get(rec.output_item_id) &&
        postTransferMatcher.byId.get(sourceToTargetIdMap.get(rec.output_item_id))) ||
      postTransferMatcher.resolve({
        id: rec.output_item_id,
        name: rec.output_item_name || rec.name,
      }).item ||
      null;
    const mappedOutputId = mappedOutputItem?.id || rec.output_item_id;
    const mappedOutputName = mappedOutputItem?.name || rec.output_item_name || rec.name;
    return { nextIngredients, mappedOutputId, mappedOutputName };
  };

  for (const rec of recipes) {
    if (rec.branch_id !== sourceBranch.id) continue;
    if (rec.menu_item_id && sourceOnlyMenuIds.has(rec.menu_item_id)) continue;

    const { nextIngredients, mappedOutputId, mappedOutputName } = mapRecipeToTarget(rec);
    const existingTargetRec =
      (rec.menu_item_id && targetRecipeByMenuId.get(rec.menu_item_id)) ||
      targetRecipeByName.get(norm(rec.name)) ||
      null;

    if (!existingTargetRec) {
      recipesToCreate.push({
        sourceRecipeId: rec.id,
        name: rec.name,
        createPayload: {
          name: rec.name,
          description: rec.description || '',
          ...(rec.menu_item_id ? { menu_item_id: rec.menu_item_id, menu_item_name: rec.menu_item_name || rec.name } : {}),
          recipe_source: rec.recipe_source || (rec.menu_item_id ? 'menu_item' : 'manufacturing'),
          output_item_id: mappedOutputId,
          output_item_name: mappedOutputName,
          output_quantity: Number(rec.output_quantity) || 1,
          output_unit: rec.output_unit || 'portion',
          ingredients: nextIngredients,
          ...(rec.product_owner_id ? { product_owner_id: rec.product_owner_id, product_owner_name: rec.product_owner_name || '' } : {}),
          branch_id: targetBranch.id,
          branch_name: targetBranch.name,
          status: rec.status || 'active',
          total_cost: Number(rec.total_cost) || 0,
          ...(rec.notes ? { notes: rec.notes } : {}),
        },
      });
    } else {
      handledTargetRecipeIds.add(existingTargetRec.id);
      const outputChanged = existingTargetRec.output_item_id !== mappedOutputId;
      const ingsChanged =
        (existingTargetRec.ingredients || []).length !== nextIngredients.length ||
        (existingTargetRec.ingredients || []).some(
          (ing, idx) => ing.inventory_item_id !== nextIngredients[idx]?.inventory_item_id
        );
      if (outputChanged || ingsChanged) {
        recipesToUpdate.push({
          id: existingTargetRec.id,
          name: existingTargetRec.name,
          branch_id: targetBranch.id,
          branch_name: targetBranch.name,
          output_item_id: mappedOutputId,
          output_item_name: mappedOutputName,
          ingredients: nextIngredients,
        });
      }
    }
  }

  // Also check any recipe already in targetBranch whose ingredients still point to sourceBranch items
  for (const tr of targetRecipes) {
    if (handledTargetRecipeIds.has(tr.id)) continue;
    const { nextIngredients, mappedOutputId, mappedOutputName } = mapRecipeToTarget(tr);
    const outputChanged = tr.output_item_id !== mappedOutputId;
    const ingsChanged = (tr.ingredients || []).some(
      (ing, idx) => ing.inventory_item_id !== nextIngredients[idx]?.inventory_item_id
    );
    if (outputChanged || ingsChanged) {
      recipesToUpdate.push({
        id: tr.id,
        name: tr.name,
        branch_id: targetBranch.id,
        branch_name: targetBranch.name,
        output_item_id: mappedOutputId,
        output_item_name: mappedOutputName,
        ingredients: nextIngredients,
      });
    }
  }

  const totalRecipeSyncCount = recipesToCreate.length + recipesToUpdate.length;

  return {
    sourceBranch: { id: sourceBranch.id, name: sourceBranch.name },
    targetBranch: { id: targetBranch.id, name: targetBranch.name },
    summary: {
      sourceActiveCount: sourceActiveItems.length,
      existingTargetCount: existingTargetItems.length,
      itemsToCopyCount: itemsToCopy.length,
      itemsToMoveCount: itemsToCopy.length,
      itemsAlreadyInTargetCount: itemsAlreadyInTarget.length,
      ambiguousInventoryCount: ambiguousInventoryItems.length,
      affectedMenuItemsCount: menuUpdates.length,
      relinkedIngredientsCount: recipeLinkDetails.length,
      alreadyLinkedMenusCount,
      alreadyLinkedIngredientsCount,
      idChangedIngredientsCount: recipeLinkDetails.filter((d) => d.idChanged).length,
      unresolvedIngredientsCount: unresolvedRecipeLinks.length,
      preservedSourceMenuItemsCount: preservedSourceMenuItems.length,
      manufacturingRecipesToCreateCount: recipesToCreate.length,
      manufacturingRecipesToUpdateCount: totalRecipeSyncCount,
    },
    itemsToCopy,
    itemsToMove: itemsToCopy,
    itemsAlreadyInTarget,
    ambiguousInventoryItems,
    menuUpdates,
    recipeLinkDetails,
    unresolvedRecipeLinks,
    recipesToCreate,
    recipesToUpdate,
  };
}

export async function executeBranchInventoryTransfer(svc, { sourceBranchId, targetBranchId, dryRun = false }) {
  const [sourceBranch, targetBranch] = await Promise.all([
    svc.entities.Branch.get(sourceBranchId).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
    svc.entities.Branch.get(targetBranchId).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  ]);
  if (!sourceBranch) {
    const err = new Error('Source branch not found');
    err.status = 404;
    throw err;
  }
  if (!targetBranch) {
    const err = new Error('Destination branch not found');
    err.status = 404;
    throw err;
  }
  if (sourceBranch.id === targetBranch.id) {
    const err = new Error('Source and destination branches must be different');
    err.status = 400;
    throw err;
  }

  const [inventoryItems, storageLocations, menuItems, recipes] = await Promise.all([
    svc.entities.InventoryItem.list('-created_date', 1000),
    svc.entities.StorageLocation.list(),
    svc.entities.MenuItem.list('-created_date', 1000),
    svc.entities.Recipe.list('-created_date', 1000),
  ]);

  const initialPlan = buildBranchTransferPlan({
    sourceBranch,
    targetBranch,
    inventoryItems,
    storageLocations,
    menuItems,
    recipes,
  });

  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      ...initialPlan.summary,
      unresolved_recipe_links: initialPlan.unresolvedRecipeLinks,
      ambiguous_inventory_items: initialPlan.ambiguousInventoryItems,
    };
  }

  // Step 1: Code (create) destination-branch inventory item copies with quantity: 0.
  // Source-branch inventory items are NEVER updated or moved.
  const createdItems = [];
  const createPayloads = initialPlan.itemsToCopy.map((c) => c.createPayload);
  for (let i = 0; i < createPayloads.length; i += 500) {
    const batch = createPayloads.slice(i, i + 500);
    if (svc.entities.InventoryItem.bulkCreate) {
      try {
        const res = await svc.entities.InventoryItem.bulkCreate(batch);
        if (Array.isArray(res)) createdItems.push(...res);
        continue;
      } catch (_bulkErr) {
        // Fallback to individual creates below
      }
    }
    for (const payload of batch) {
      const created = await svc.entities.InventoryItem.create(payload);
      if (created) createdItems.push(created);
    }
  }

  // Step 2: Resolve final plan using the newly created destination-branch item IDs
  let allInventoryAfterCopy = inventoryItems;
  if (createPayloads.length > 0) {
    const hasAllIds =
      createdItems.length === createPayloads.length &&
      createdItems.every((item) => item && item.id);
    if (hasAllIds) {
      allInventoryAfterCopy = [...inventoryItems, ...createdItems];
    } else {
      allInventoryAfterCopy = await svc.entities.InventoryItem.list('-created_date', 1000);
    }
  }

  const finalPlan = buildBranchTransferPlan({
    sourceBranch,
    targetBranch,
    inventoryItems: allInventoryAfterCopy,
    storageLocations,
    menuItems,
    recipes,
  });

  // Step 3: Relink MenuItem recipe ingredients to the destination-branch inventory items
  let updatedMenuItemsCount = 0;
  for (const mUpdate of finalPlan.menuUpdates) {
    if (mUpdate.needsRecordWrite) {
      await svc.entities.MenuItem.update(mUpdate.menu_item_id, {
        recipe: mUpdate.nextRecipe,
      });
    }
    updatedMenuItemsCount += 1;
  }

  // Step 4: Create destination-branch recipe copies and update any existing destination-branch recipes
  let createdRecipesCount = 0;
  const recipeCreatePayloads = finalPlan.recipesToCreate.map((r) => r.createPayload);
  for (let i = 0; i < recipeCreatePayloads.length; i += 500) {
    const batch = recipeCreatePayloads.slice(i, i + 500);
    if (svc.entities.Recipe.bulkCreate) {
      try {
        await svc.entities.Recipe.bulkCreate(batch);
        createdRecipesCount += batch.length;
        continue;
      } catch (_bulkErr) {
        // Fallback to individual creates
      }
    }
    for (const payload of batch) {
      await svc.entities.Recipe.create(payload);
      createdRecipesCount += 1;
    }
  }

  let updatedExistingRecipesCount = 0;
  for (let i = 0; i < finalPlan.recipesToUpdate.length; i += 500) {
    const batch = finalPlan.recipesToUpdate.slice(i, i + 500);
    if (svc.entities.Recipe.bulkUpdate) {
      try {
        await svc.entities.Recipe.bulkUpdate(batch);
        updatedExistingRecipesCount += batch.length;
        continue;
      } catch (_bulkErr) {
        // Fallback to individual updates
      }
    }
    for (const r of batch) {
      const { id, ...fields } = r;
      await svc.entities.Recipe.update(id, fields);
      updatedExistingRecipesCount += 1;
    }
  }

  const copiedInventoryCount = createPayloads.length;
  const totalRecipesSynced = createdRecipesCount + updatedExistingRecipesCount;

  return {
    success: true,
    dry_run: false,
    source_branch: initialPlan.sourceBranch,
    target_branch: initialPlan.targetBranch,
    copied_inventory_count: copiedInventoryCount,
    moved_inventory_count: copiedInventoryCount,
    already_in_target_count: initialPlan.summary.itemsAlreadyInTargetCount,
    updated_menu_items_count: updatedMenuItemsCount,
    relinked_ingredients_count: finalPlan.summary.relinkedIngredientsCount,
    created_recipes_count: createdRecipesCount,
    updated_recipes_count: totalRecipesSynced,
    unresolved_ingredients_count: finalPlan.summary.unresolvedIngredientsCount,
    unresolved_recipe_links: finalPlan.unresolvedRecipeLinks,
    ambiguous_inventory_items: initialPlan.ambiguousInventoryItems,
  };
}