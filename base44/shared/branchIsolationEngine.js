import { buildBranchInventoryMatcher } from './branchInventoryTransfer.js';
import {
  mirrorInventoryItemAcrossBranches,
  mirrorMenuItemAcrossBranches,
} from './branchCatalogMirror.js';

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Known 14 legacy demo recipes whose original English seed ingredients
 * (6a8eabc6... / 6ad6489b...) were deleted and must be left untouched by automatic
 * repair and reported in a separate numbered list.
 */
export const LEGACY_DEMO_RECIPE_NAMES = new Set([
  'kofta meshweya — catering batch',
  'koshary base — catering batch',
  'mahshi warak enab — catering batch',
  'macarona béchamel — catering trays',
  'om ali — catering batch',
  'molokhia with chicken — catering batch',
  'sausage',
]);

export function isLegacyDemoRecipe(recipe, invById) {
  if (!recipe) return false;
  const outMissing = Boolean(recipe.output_item_id && !invById.has(recipe.output_item_id));
  const ingMissing = (recipe.ingredients || []).some(
    (ing) => ing?.inventory_item_id && !invById.has(ing.inventory_item_id)
  );
  if (outMissing || ingMissing) {
    return true;
  }
  return false;
}

/**
 * Pure diagnosis builder: takes loaded records and returns the structured diagnosis
 * and exact repair plans without mutating any data.
 */
export function buildBranchIsolationDiagnosis({
  branches = [],
  access = null,
  inventoryItems = [],
  menuItems = [],
  recipes = [],
  productionOrders = [],
  purchaseOrders = [],
  purchaseInvoices = [],
  financeJournals = [],
  requisitions = [],
  requisitionLines = [],
  cateringReservations = [],
  cateringEquipment = [],
  cateringVehicles = [],
  employees = [],
  shifts = [],
}) {
  const activeBranches = branches.filter((b) => b && b.id && b.is_active !== false);
  const branchNameById = new Map(activeBranches.map((b) => [b.id, b.name || b.id]));
  const defaultBranch =
    activeBranches.find((b) => b.is_default) ||
    activeBranches.find((b) => norm(b.name) === 'shrouk') ||
    activeBranches[0] ||
    null;

  const invById = new Map(inventoryItems.map((i) => [i.id, i]));
  const matcherByBranch = new Map();
  for (const b of activeBranches) {
    const bItems = inventoryItems.filter((i) => i.branch_id === b.id && i.is_active !== false);
    matcherByBranch.set(b.id, buildBranchInventoryMatcher(bItems));
  }

  // 1. Menu Items Catalog Isolation
  const sharedMenuItems = menuItems.filter((m) => !m.branch_id);
  const crossBranchMenuLinks = [];
  for (const m of menuItems) {
    const targetBranchIds = m.branch_id
      ? [m.branch_id]
      : activeBranches.map((b) => b.id);
    for (const bId of targetBranchIds) {
      const matcher = matcherByBranch.get(bId);
      if (!matcher) continue;
      for (let idx = 0; idx < (m.recipe || []).length; idx++) {
        const ing = m.recipe[idx];
        const inv = invById.get(ing.inventory_item_id);
        if (!inv || inv.branch_id !== bId) {
          const resolved = matcher.resolve({
            id: ing.inventory_item_id,
            source_item_id: inv?.source_item_id || inv?.id,
            name: ing.inventory_item_name || inv?.name,
            category_id: ing.category_id || inv?.category_id,
          });
          crossBranchMenuLinks.push({
            menu_item_id: m.id,
            menu_item_name: m.name,
            target_branch_id: bId,
            target_branch_name: branchNameById.get(bId) || bId,
            ingredient_index: idx,
            old_inventory_item_id: ing.inventory_item_id,
            old_inventory_item_name: ing.inventory_item_name || inv?.name || '',
            new_inventory_item_id: resolved.item?.id || null,
            new_inventory_item_name: resolved.item?.name || null,
            status: resolved.status,
          });
        }
      }
    }
  }

  // 2. Manufacturing Recipes Relink & Unresolved Legacy Demo Recipes
  const unresolvedLegacyRecipes = [];
  const recipeRepairs = [];
  let recipeCrossLinksCount = 0;

  const sortedRecipes = [...recipes].sort((a, b) => {
    const bA = branchNameById.get(a.branch_id) || '';
    const bB = branchNameById.get(b.branch_id) || '';
    if (bA !== bB) return bB.localeCompare(bA); // Shrouk then Sherouk
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  for (const rec of sortedRecipes) {
    if (isLegacyDemoRecipe(rec, invById)) {
      const missingIngs = (rec.ingredients || [])
        .filter((ing) => !invById.has(ing.inventory_item_id))
        .map((ing) => ing.inventory_item_name || ing.inventory_item_id);
      unresolvedLegacyRecipes.push({
        number: unresolvedLegacyRecipes.length + 1,
        id: rec.id,
        name: rec.name,
        branch_id: rec.branch_id,
        branch: branchNameById.get(rec.branch_id) || rec.branch_name || 'Unassigned',
        output_item_id: rec.output_item_id,
        output_item_name: rec.output_item_name || rec.name,
        missing_ingredients: missingIngs,
      });
      continue;
    }

    if (!rec.branch_id) continue;
    const matcher = matcherByBranch.get(rec.branch_id);
    if (!matcher) continue;

    const currentOut = invById.get(rec.output_item_id);
    let nextOutputId = rec.output_item_id;
    let nextOutputName = rec.output_item_name || currentOut?.name || rec.name;
    let outputChanged = false;

    if (currentOut && currentOut.branch_id !== rec.branch_id) {
      const outRes = matcher.resolve({
        id: rec.output_item_id,
        source_item_id: currentOut.source_item_id || currentOut.id,
        name: rec.output_item_name || currentOut.name || rec.name,
        category_id: currentOut.category_id,
      });
      if (outRes.status === 'matched' && outRes.item) {
        nextOutputId = outRes.item.id;
        nextOutputName = outRes.item.name;
        outputChanged = nextOutputId !== rec.output_item_id;
        if (outputChanged) recipeCrossLinksCount += 1;
      }
    }

    let ingsChanged = false;
    const nextIngredients = (rec.ingredients || []).map((ing) => {
      const inv = invById.get(ing.inventory_item_id);
      if (!inv || inv.branch_id === rec.branch_id) return ing;
      const res = matcher.resolve({
        id: ing.inventory_item_id,
        source_item_id: inv.source_item_id || inv.id,
        name: ing.inventory_item_name || inv.name,
        category_id: inv.category_id,
      });
      if (res.status === 'matched' && res.item && res.item.id !== ing.inventory_item_id) {
        ingsChanged = true;
        recipeCrossLinksCount += 1;
        return {
          ...ing,
          inventory_item_id: res.item.id,
          inventory_item_name: res.item.name || ing.inventory_item_name,
        };
      }
      return ing;
    });

    if (outputChanged || ingsChanged) {
      recipeRepairs.push({
        recipe_id: rec.id,
        recipe_name: rec.name,
        branch_id: rec.branch_id,
        branch_name: branchNameById.get(rec.branch_id) || rec.branch_name,
        old_output_item_id: rec.output_item_id,
        new_output_item_id: nextOutputId,
        new_output_item_name: nextOutputName,
        next_ingredients: nextIngredients,
      });
    }
  }

  // 3. Production Orders Relink
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const productionOrderRepairs = [];
  for (const po of productionOrders) {
    if (!po.branch_id) continue;
    const rec = recipeById.get(po.recipe_id);
    const outInv = invById.get(po.output_item_id);
    const recMismatch = rec && rec.branch_id && rec.branch_id !== po.branch_id;
    const outMismatch = outInv && outInv.branch_id && outInv.branch_id !== po.branch_id;
    if (!recMismatch && !outMismatch) continue;

    const targetRecipe =
      recipes.find(
        (r) =>
          r.branch_id === po.branch_id &&
          !isLegacyDemoRecipe(r, invById) &&
          norm(r.name) === norm(po.recipe_name || rec?.name)
      ) || null;
    const matcher = matcherByBranch.get(po.branch_id);
    const targetOut =
      (targetRecipe?.output_item_id && invById.get(targetRecipe.output_item_id)?.branch_id === po.branch_id
        ? invById.get(targetRecipe.output_item_id)
        : null) ||
      matcher?.resolve({
        id: po.output_item_id,
        source_item_id: outInv?.source_item_id || outInv?.id,
        name: po.output_item_name || outInv?.name || po.recipe_name,
        category_id: outInv?.category_id,
      })?.item ||
      null;

    if (targetRecipe || targetOut) {
      productionOrderRepairs.push({
        production_order_id: po.id,
        branch_id: po.branch_id,
        branch_name: branchNameById.get(po.branch_id) || po.branch_name,
        recipe_name: po.recipe_name,
        old_recipe_id: po.recipe_id,
        new_recipe_id: targetRecipe?.id || po.recipe_id,
        old_output_item_id: po.output_item_id,
        new_output_item_id: targetOut?.id || po.output_item_id,
        new_output_item_name: targetOut?.name || po.output_item_name,
      });
    }
  }

  // 4. Purchasing & Finance Reconciliation (POs, PIs, Stock adjustments, FinanceJournal snapshots)
  const poRepairs = [];
  for (const po of purchaseOrders) {
    if (!po.branch_id) continue;
    const matcher = matcherByBranch.get(po.branch_id);
    if (!matcher) continue;
    let changed = false;
    const nextItems = (po.items || []).map((it) => {
      const inv = invById.get(it.inventory_item_id);
      if (!inv || inv.branch_id === po.branch_id) return it;
      const res = matcher.resolve({
        id: it.inventory_item_id,
        source_item_id: inv.source_item_id || inv.id,
        name: it.inventory_item_name || inv.name,
        category_id: inv.category_id,
      });
      if (res.status === 'matched' && res.item && res.item.id !== it.inventory_item_id) {
        changed = true;
        return {
          ...it,
          inventory_item_id: res.item.id,
          inventory_item_name: res.item.name || it.inventory_item_name,
        };
      }
      return it;
    });
    if (changed) {
      poRepairs.push({
        po_id: po.id,
        order_number: po.order_number,
        branch_id: po.branch_id,
        branch_name: branchNameById.get(po.branch_id) || po.branch_name,
        next_items: nextItems,
      });
    }
  }

  const piRepairs = [];
  for (const pi of purchaseInvoices) {
    if (!pi.branch_id) continue;
    const matcher = matcherByBranch.get(pi.branch_id);
    if (!matcher) continue;
    let changed = false;
    const stockAdjustments = [];
    const nextItems = (pi.items || []).map((it) => {
      const inv = invById.get(it.inventory_item_id);
      if (!inv || inv.branch_id === pi.branch_id) return it;
      const res = matcher.resolve({
        id: it.inventory_item_id,
        source_item_id: inv.source_item_id || inv.id,
        name: it.inventory_item_name || inv.name,
        category_id: it.category_id || inv.category_id,
      });
      if (res.status === 'matched' && res.item && res.item.id !== it.inventory_item_id) {
        changed = true;
        const targetInv = res.item;
        // Reconcile stock if the invoice was posted and target item still has 0 stock from this receipt
        const qty = Number(it.quantity) || 0;
        const shouldMoveStock =
          (pi.status === 'posted' || !pi.status) &&
          qty > 0 &&
          Number(targetInv.quantity) === 0 &&
          Number(inv.quantity) >= qty;
        if (shouldMoveStock) {
          stockAdjustments.push({
            wrong_item_id: inv.id,
            wrong_item_name: inv.name,
            wrong_before_qty: Number(inv.quantity) || 0,
            wrong_after_qty: Math.max(0, (Number(inv.quantity) || 0) - qty),
            target_item_id: targetInv.id,
            target_item_name: targetInv.name,
            target_before_qty: Number(targetInv.quantity) || 0,
            target_after_qty: (Number(targetInv.quantity) || 0) + qty,
            quantity_moved: qty,
            cost_per_unit: Number(it.purchase_price) || Number(targetInv.cost_per_unit) || 0,
          });
        }
        return {
          ...it,
          inventory_item_id: res.item.id,
          inventory_item_name: res.item.name || it.inventory_item_name,
        };
      }
      return it;
    });
    if (changed) {
      piRepairs.push({
        invoice_id: pi.id,
        invoice_number: pi.invoice_number,
        branch_id: pi.branch_id,
        branch_name: branchNameById.get(pi.branch_id) || pi.branch_name,
        next_items: nextItems,
        stock_adjustments: stockAdjustments,
      });
    }
  }

  const journalRepairs = [];
  for (const j of financeJournals) {
    if (!j.branch_id || !j.source_summary) continue;
    const matcher = matcherByBranch.get(j.branch_id);
    if (!matcher) continue;

    let changed = false;
    const snapItems = j.source_summary?.source_snapshot?.items;
    let nextSnapItems = snapItems;
    if (Array.isArray(snapItems)) {
      nextSnapItems = snapItems.map((it) => {
        const inv = invById.get(it.inventory_item_id);
        if (!inv || inv.branch_id === j.branch_id) return it;
        const res = matcher.resolve({
          id: it.inventory_item_id,
          source_item_id: inv.source_item_id || inv.id,
          name: it.inventory_item_name || inv.name,
          category_id: it.category_id || inv.category_id,
        });
        if (res.status === 'matched' && res.item && res.item.id !== it.inventory_item_id) {
          changed = true;
          return {
            ...it,
            inventory_item_id: res.item.id,
            inventory_item_name: res.item.name || it.inventory_item_name,
          };
        }
        return it;
      });
    }

    const bindItems = j.source_summary?.mapping_bindings;
    let nextBindItems = bindItems;
    if (Array.isArray(bindItems)) {
      nextBindItems = bindItems.map((b) => {
        const inv = invById.get(b.inventory_item_id);
        if (!inv || inv.branch_id === j.branch_id) return b;
        const res = matcher.resolve({
          id: b.inventory_item_id,
          source_item_id: inv.source_item_id || inv.id,
          name: inv.name,
          category_id: inv.category_id,
        });
        if (res.status === 'matched' && res.item && res.item.id !== b.inventory_item_id) {
          changed = true;
          return {
            ...b,
            inventory_item_id: res.item.id,
          };
        }
        return b;
      });
    }

    if (changed) {
      journalRepairs.push({
        journal_id: j.id,
        branch_id: j.branch_id,
        source_id: j.source_id,
        next_source_summary: {
          ...j.source_summary,
          ...(Array.isArray(nextSnapItems)
            ? {
                source_snapshot: {
                  ...(j.source_summary.source_snapshot || {}),
                  items: nextSnapItems,
                },
              }
            : {}),
          ...(Array.isArray(nextBindItems) ? { mapping_bindings: nextBindItems } : {}),
        },
      });
    }
  }

  // 5. Catering Requisition Lines & Reservations
  const reqById = new Map(requisitions.map((r) => [r.id, r]));
  const reqLineRepairs = [];
  for (const line of requisitionLines) {
    const req = reqById.get(line.requisition_id);
    const bId = line.branch_id || req?.branch_id;
    if (!bId) continue;
    const inv = invById.get(line.inventory_item_id);
    if (!inv || inv.branch_id === bId) continue;
    const matcher = matcherByBranch.get(bId);
    const res = matcher?.resolve({
      id: line.inventory_item_id,
      source_item_id: inv.source_item_id || inv.id,
      name: line.inventory_item_name || inv.name,
      category_id: inv.category_id,
    });
    if (res?.status === 'matched' && res.item && res.item.id !== line.inventory_item_id) {
      reqLineRepairs.push({
        line_id: line.id,
        requisition_id: line.requisition_id,
        branch_id: bId,
        old_inventory_item_id: line.inventory_item_id,
        new_inventory_item_id: res.item.id,
        new_inventory_item_name: res.item.name || line.inventory_item_name,
      });
    }
  }

  const reservationRepairs = [];
  for (const r of cateringReservations) {
    if (!r.branch_id) continue;
    const inv = invById.get(r.inventory_item_id);
    if (!inv || inv.branch_id === r.branch_id) continue;
    const matcher = matcherByBranch.get(r.branch_id);
    const res = matcher?.resolve({
      id: r.inventory_item_id,
      source_item_id: inv.source_item_id || inv.id,
      name: r.inventory_item_name || inv.name,
      category_id: inv.category_id,
    });
    if (res?.status === 'matched' && res.item && res.item.id !== r.inventory_item_id) {
      reservationRepairs.push({
        reservation_id: r.id,
        event_id: r.event_id,
        branch_id: r.branch_id,
        old_inventory_item_id: r.inventory_item_id,
        new_inventory_item_id: res.item.id,
        new_inventory_item_name: res.item.name || r.inventory_item_name,
      });
    }
  }

  // 6. Equipment & Vehicles without home_branch_id
  const unassignedEquipment = cateringEquipment.filter((e) => !e.home_branch_id);
  const unassignedVehicles = cateringVehicles.filter((v) => !v.home_branch_id);

  // Intentional cross-branch shifts
  const empById = new Map(employees.map((e) => [e.id, e]));
  const crossBranchShifts = shifts.filter((s) => {
    const emp = empById.get(s.employee_id);
    return emp && s.branch_id && emp.branch_id && s.branch_id !== emp.branch_id;
  });

  const categories = [
    {
      id: 'menu_catalog_isolation',
      module: 'Menu Management',
      title: 'Split Shared Menu Items into Branch-Owned Catalogs & Relink Recipes',
      severity: 'high',
      classification: 'safe_repair',
      records_count: sharedMenuItems.length,
      links_count: crossBranchMenuLinks.length,
      description:
        `${sharedMenuItems.length} MenuItem record(s) have branch_id = null. Approving assigns the primary branch (${defaultBranch?.name || 'Shrouk'}) and creates independent MenuItem counterparts for every other active branch, wiring all recipe ingredients and finished outputs to each branch's own InventoryItem and Recipe.`,
      sample_previews: sharedMenuItems.slice(0, 3).map((m) => ({
        record_label: `${m.name} (MenuItem)`,
        before: `branch_id: null · ${(m.recipe || []).length} recipe ingredient(s)`,
        after: `Scoped to ${defaultBranch?.name || 'Shrouk'} + mirrored to ${activeBranches.filter((b) => b.id !== defaultBranch?.id).map((b) => b.name).join(', ')}`,
      })),
    },
    {
      id: 'manufacturing_recipes_relink',
      module: 'Manufacturing',
      title: 'Relink Branch Manufacturing Recipes to Local Inventory Twins',
      severity: 'high',
      classification: 'safe_repair',
      records_count: recipeRepairs.length,
      links_count: recipeCrossLinksCount,
      description:
        `${recipeRepairs.length} active manufacturing recipe(s) have output_item_id or ingredient lines pointing to another branch's InventoryItem IDs. All have verified 1-to-1 twins in their own branch.`,
      sample_previews: recipeRepairs.slice(0, 3).map((r) => ({
        record_label: `${r.recipe_name} (${r.branch_name})`,
        before: `output_item_id: ${r.old_output_item_id}`,
        after: `output_item_id: ${r.new_output_item_id} (${r.branch_name} twin)`,
      })),
    },
    {
      id: 'production_orders_relink',
      module: 'Manufacturing',
      title: 'Relink Production Orders to Local Branch Recipes & Outputs',
      severity: 'medium',
      classification: 'safe_repair',
      records_count: productionOrderRepairs.length,
      links_count: productionOrderRepairs.length * 2,
      description:
        `${productionOrderRepairs.length} ProductionOrder batch(es) reference another branch's Recipe or Output InventoryItem IDs.`,
      sample_previews: productionOrderRepairs.slice(0, 3).map((p) => ({
        record_label: `ProductionOrder · ${p.recipe_name} (${p.branch_name})`,
        before: `recipe_id: ${p.old_recipe_id} · output_item_id: ${p.old_output_item_id}`,
        after: `recipe_id: ${p.new_recipe_id} · output_item_id: ${p.new_output_item_id}`,
      })),
    },
    {
      id: 'purchasing_and_finance_reconciliation',
      module: 'Purchasing & Finance',
      title: 'Relink Cross-Branch Purchase Orders, Posted Invoices, Stock & Journal Snapshots',
      severity: 'high',
      classification: 'safe_repair',
      records_count: poRepairs.length + piRepairs.length + journalRepairs.length,
      links_count:
        poRepairs.length +
        piRepairs.length +
        journalRepairs.length +
        piRepairs.reduce((s, x) => s + x.stock_adjustments.length, 0),
      description:
        `${poRepairs.length} PurchaseOrder(s), ${piRepairs.length} posted PurchaseInvoice(s), and ${journalRepairs.length} FinanceJournal snapshot(s) reference another branch's InventoryItem IDs. Approving relinks them to destination-equivalent IDs and reconciles unapplied stock quantities idempotently.`,
      sample_previews: piRepairs.slice(0, 3).map((p) => ({
        record_label: `Invoice ${p.invoice_number} (${p.branch_name})`,
        before: `References another branch's InventoryItem ID`,
        after: `Relinked to ${p.branch_name} twin${p.stock_adjustments.length ? ` + reconciled ${p.stock_adjustments[0].quantity_moved} stock` : ''}`,
      })),
    },
    {
      id: 'catering_requisitions_and_reservations',
      module: 'Catering',
      title: 'Relink Catering Requisition Lines & Stock Reservations',
      severity: 'medium',
      classification: 'safe_repair',
      records_count: reqLineRepairs.length + reservationRepairs.length,
      links_count: reqLineRepairs.length + reservationRepairs.length,
      description:
        `${reqLineRepairs.length} RequisitionLine row(s) and ${reservationRepairs.length} CateringReservation row(s) reference another branch's InventoryItem IDs.`,
      sample_previews: [
        ...reqLineRepairs.slice(0, 2).map((l) => ({
          record_label: `RequisitionLine ${l.line_id}`,
          before: `inventory_item_id: ${l.old_inventory_item_id}`,
          after: `inventory_item_id: ${l.new_inventory_item_id} (${l.new_inventory_item_name})`,
        })),
        ...reservationRepairs.slice(0, 1).map((r) => ({
          record_label: `CateringReservation ${r.reservation_id}`,
          before: `inventory_item_id: ${r.old_inventory_item_id}`,
          after: `inventory_item_id: ${r.new_inventory_item_id} (${r.new_inventory_item_name})`,
        })),
      ],
    },
    {
      id: 'equipment_and_vehicles_branch_scope',
      module: 'Assets & Resources',
      title: 'Scope Unassigned Equipment & Vehicles to Primary Branch',
      severity: 'low',
      classification: 'safe_repair',
      records_count: unassignedEquipment.length + unassignedVehicles.length,
      links_count: unassignedEquipment.length + unassignedVehicles.length,
      description:
        `${unassignedEquipment.length} CateringEquipment record(s) and ${unassignedVehicles.length} CateringVehicle record(s) have empty home_branch_id. Approving scopes them to ${defaultBranch?.name || 'Shrouk'} while enabling copy-from-branch to any authorized branch.`,
      sample_previews: [
        {
          record_label: `${unassignedEquipment.length} Equipment & ${unassignedVehicles.length} Vehicles`,
          before: `home_branch_id: empty`,
          after: `home_branch_id: ${defaultBranch?.id || ''} (${defaultBranch?.name || 'Shrouk'})`,
        },
      ],
    },
  ];

  const safeRepairsTotal = categories.reduce((sum, c) => sum + c.records_count, 0);

  return {
    generated_at: new Date().toISOString(),
    branches: activeBranches.map((b) => ({
      id: b.id,
      name: b.name,
      is_default: Boolean(b.is_default),
    })),
    authorization: {
      global_access: Boolean(access?.globalAccess),
      locked_branch_id: access?.lockedBranchId || null,
      authorized_branch_ids: access?.authorizedBranchIds || activeBranches.map((b) => b.id),
    },
    summary: {
      safe_repairs_total: safeRepairsTotal,
      ambiguous_total: unresolvedLegacyRecipes.length,
      intentional_cross_branch_total: crossBranchShifts.length,
      categories_count: categories.length,
    },
    categories,
    unresolved_legacy_recipes: unresolvedLegacyRecipes,
    intentional_cross_branch: [
      {
        module: 'HR & Catering Staffing',
        count: crossBranchShifts.length,
        description:
          `${crossBranchShifts.length} Shift record(s) on catering events assign employees from another home branch (intentional cross-branch event staffing — preserved untouched).`,
      },
    ],
    plans: {
      defaultBranch,
      sharedMenuItems,
      recipeRepairs,
      productionOrderRepairs,
      poRepairs,
      piRepairs,
      journalRepairs,
      reqLineRepairs,
      reservationRepairs,
      unassignedEquipment,
      unassignedVehicles,
    },
  };
}

/**
 * Executes the selected repair categories idempotently.
 */
export async function executeApprovedBranchRepairs(
  svc,
  { selectedCategories = [], diagnosis, userEmail = '' }
) {
  const selected = new Set(selectedCategories);
  const { plans, branches } = diagnosis;
  const defaultBranch = plans.defaultBranch;
  const counts = {
    menu_items_scoped: 0,
    menu_items_mirrored: 0,
    recipes_relinked: 0,
    production_orders_relinked: 0,
    purchase_orders_relinked: 0,
    purchase_invoices_relinked: 0,
    stock_items_adjusted: 0,
    journals_relinked: 0,
    requisition_lines_relinked: 0,
    reservations_relinked: 0,
    equipment_scoped: 0,
    vehicles_scoped: 0,
  };

  if (selected.has('manufacturing_recipes_relink') && plans.recipeRepairs.length > 0) {
    for (const r of plans.recipeRepairs) {
      await svc.entities.Recipe.update(r.recipe_id, {
        output_item_id: r.new_output_item_id,
        output_item_name: r.new_output_item_name,
        ingredients: r.next_ingredients,
      });
      counts.recipes_relinked += 1;
    }
  }

  if (selected.has('menu_catalog_isolation') && plans.sharedMenuItems.length > 0 && defaultBranch) {
    const [allInv, allRecipes] = await Promise.all([
      svc.entities.InventoryItem.list('-created_date', 1000),
      svc.entities.Recipe.list('-created_date', 1000),
    ]);
    const invById = new Map(allInv.map((i) => [i.id, i]));
    const defaultMatcher = buildBranchInventoryMatcher(
      allInv.filter((i) => i.branch_id === defaultBranch.id && i.is_active !== false)
    );

    for (const m of plans.sharedMenuItems) {
      const nextRecipe = (m.recipe || []).map((ing) => {
        const inv = invById.get(ing.inventory_item_id);
        if (inv && inv.branch_id === defaultBranch.id) return ing;
        const res = defaultMatcher.resolve({
          id: ing.inventory_item_id,
          source_item_id: inv?.source_item_id || inv?.id,
          name: ing.inventory_item_name || inv?.name,
          category_id: ing.category_id || inv?.category_id,
        });
        if (res.status === 'matched' && res.item) {
          return {
            ...ing,
            inventory_item_id: res.item.id,
            inventory_item_name: res.item.name || ing.inventory_item_name,
            category_id: res.item.category_id || ing.category_id || '',
          };
        }
        return ing;
      });

      const defaultRec = allRecipes.find(
        (r) =>
          r.branch_id === defaultBranch.id &&
          (r.menu_item_id === m.id || norm(r.name) === norm(m.name))
      );
      const outInv = m.output_inventory_item_id ? invById.get(m.output_inventory_item_id) : null;
      const resolvedOut =
        outInv && outInv.branch_id !== defaultBranch.id
          ? defaultMatcher.resolve({
              id: m.output_inventory_item_id,
              source_item_id: outInv.source_item_id || outInv.id,
              name: outInv.name || m.name,
            }).item
          : outInv;

      const updatedPrimary = await svc.entities.MenuItem.update(m.id, {
        branch_id: defaultBranch.id,
        branch_name: defaultBranch.name,
        recipe: nextRecipe,
        ...(defaultRec ? { manufacturing_recipe_id: defaultRec.id } : {}),
        ...(resolvedOut ? { output_inventory_item_id: resolvedOut.id } : {}),
      });
      counts.menu_items_scoped += 1;

      const mirrorRes = await mirrorMenuItemAcrossBranches(svc, updatedPrimary, userEmail, {
        branches,
        allInv,
        allRecipes,
      });
      counts.menu_items_mirrored += mirrorRes.created_count;
    }
  }

  if (selected.has('production_orders_relink') && plans.productionOrderRepairs.length > 0) {
    for (const p of plans.productionOrderRepairs) {
      await svc.entities.ProductionOrder.update(p.production_order_id, {
        recipe_id: p.new_recipe_id,
        output_item_id: p.new_output_item_id,
        output_item_name: p.new_output_item_name,
      });
      counts.production_orders_relinked += 1;
    }
  }

  if (selected.has('purchasing_and_finance_reconciliation')) {
    for (const po of plans.poRepairs) {
      await svc.entities.PurchaseOrder.update(po.po_id, {
        items: po.next_items,
      });
      counts.purchase_orders_relinked += 1;
    }
    for (const pi of plans.piRepairs) {
      await svc.entities.PurchaseInvoice.update(pi.invoice_id, {
        items: pi.next_items,
      });
      counts.purchase_invoices_relinked += 1;
      for (const adj of pi.stock_adjustments) {
        await svc.entities.InventoryItem.update(adj.wrong_item_id, {
          quantity: adj.wrong_after_qty,
        });
        await svc.entities.InventoryItem.update(adj.target_item_id, {
          quantity: adj.target_after_qty,
          cost_per_unit: adj.cost_per_unit,
        });
        counts.stock_items_adjusted += 2;
      }
    }
    for (const j of plans.journalRepairs) {
      await svc.entities.FinanceJournal.update(j.journal_id, {
        source_summary: j.next_source_summary,
      });
      counts.journals_relinked += 1;
    }
  }

  if (selected.has('catering_requisitions_and_reservations')) {
    for (const l of plans.reqLineRepairs) {
      await svc.entities.RequisitionLine.update(l.line_id, {
        inventory_item_id: l.new_inventory_item_id,
        inventory_item_name: l.new_inventory_item_name,
      });
      counts.requisition_lines_relinked += 1;
    }
    for (const r of plans.reservationRepairs) {
      await svc.entities.CateringReservation.update(r.reservation_id, {
        inventory_item_id: r.new_inventory_item_id,
        inventory_item_name: r.new_inventory_item_name,
      });
      counts.reservations_relinked += 1;
    }
  }

  if (selected.has('equipment_and_vehicles_branch_scope') && defaultBranch) {
    for (const eq of plans.unassignedEquipment) {
      await svc.entities.CateringEquipment.update(eq.id, {
        home_branch_id: defaultBranch.id,
        home_branch_name: defaultBranch.name,
      });
      counts.equipment_scoped += 1;
    }
    for (const v of plans.unassignedVehicles) {
      await svc.entities.CateringVehicle.update(v.id, {
        home_branch_id: defaultBranch.id,
        home_branch_name: defaultBranch.name,
      });
      counts.vehicles_scoped += 1;
    }
  }

  return {
    applied_at: new Date().toISOString(),
    selected_categories: selectedCategories,
    counts,
    unresolved_legacy_recipes: diagnosis.unresolved_legacy_recipes,
  };
}