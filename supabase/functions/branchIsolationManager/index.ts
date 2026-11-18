import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';
import { loadUserBranchScope, canUserAccessBranch } from '../_shared/branchAccess.js';
import {
  buildBranchIsolationDiagnosis,
  executeApprovedBranchRepairs,
} from '../_shared/branchIsolationEngine.js';
import {
  mirrorInventoryItemAcrossBranches,
  mirrorMenuItemAcrossBranches,
  mirrorStandaloneRecipeAcrossBranches,
  copyBranchEquipmentAndVehicles,
} from '../_shared/branchCatalogMirror.js';
import { audit } from '../_shared/auditLog.js';

async function loadAllForDiagnosis(svc) {
  const [
    branches,
    inventoryItems,
    menuItems,
    recipes,
    productionOrders,
    purchaseOrders,
    purchaseInvoices,
    financeJournals,
    requisitions,
    requisitionLines,
    cateringReservations,
    cateringEquipment,
    cateringVehicles,
    employees,
    shifts,
  ] = await Promise.all([
    svc.entities.Branch.list('created_date', 100),
    svc.entities.InventoryItem.list('-created_date', 1000),
    svc.entities.MenuItem.list('-created_date', 1000),
    svc.entities.Recipe.list('-created_date', 1000),
    svc.entities.ProductionOrder.list('-created_date', 1000),
    svc.entities.PurchaseOrder.list('-created_date', 1000),
    svc.entities.PurchaseInvoice.list('-created_date', 1000),
    svc.entities.FinanceJournal.list('-created_date', 1000),
    svc.entities.Requisition.list('-created_date', 1000),
    svc.entities.RequisitionLine.list('-created_date', 1000),
    svc.entities.CateringReservation.list('-created_date', 1000),
    svc.entities.CateringEquipment.list('-created_date', 1000),
    svc.entities.CateringVehicle.list('-created_date', 500),
    svc.entities.Employee.list('-created_date', 500),
    svc.entities.Shift.list('-created_date', 1000),
  ]);

  return {
    branches,
    inventoryItems,
    menuItems,
    recipes,
    productionOrders,
    purchaseOrders,
    purchaseInvoices,
    financeJournals,
    requisitions,
    requisitionLines,
    cateringReservations,
    cateringEquipment,
    cateringVehicles,
    employees,
    shifts,
  };
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const permCheck = await checkPermission(base44, user, [
      'admin_systems',
      'admin_settings',
      'inventory_edit',
      'menu_edit',
      'manufacturing_edit',
      'catering_settings_edit',
      'catering_edit',
    ]);
    if (!permCheck.allowed) {
      return Response.json({ error: permCheck.reason }, { status: permCheck.status });
    }

    const body = await req.json().catch(() => ({}));
    const {
      action = 'scan',
      selected_categories = [],
      source_branch_id,
      target_branch_id,
      asset_types = ['equipment', 'vehicles'],
      equipment_ids = null,
      vehicle_ids = null,
      inventory_item_ids = [],
      menu_item_id = null,
      recipe_id = null,
    } = body;

    const svc = base44.asServiceRole;
    const access = await loadUserBranchScope(base44, user, permCheck.permissions);

    if (action === 'scan') {
      const data = await loadAllForDiagnosis(svc);
      const diagnosis = buildBranchIsolationDiagnosis({ ...data, access });
      const { plans: _plans, ...publicReport } = diagnosis;
      return Response.json(publicReport);
    }

    if (action === 'apply_repairs') {
      if (!access.globalAccess) {
        return Response.json(
          { error: 'Forbidden: applying system-wide branch isolation repairs requires central/global admin access' },
          { status: 403 }
        );
      }
      if (!Array.isArray(selected_categories) || selected_categories.length === 0) {
        return Response.json({ error: 'selected_categories is required' }, { status: 400 });
      }
      const data = await loadAllForDiagnosis(svc);
      const diagnosis = buildBranchIsolationDiagnosis({ ...data, access });
      const result = await executeApprovedBranchRepairs(svc, {
        selectedCategories: selected_categories,
        diagnosis,
        userEmail: user.email || '',
      });

      await audit(
        base44,
        user,
        'update',
        'BranchIsolation',
        `Applied ${selected_categories.length} approved branch isolation repair category(s): ${selected_categories.join(', ')}`,
        {
          changes: result.counts,
        }
      );

      return Response.json({
        success: true,
        message: `Applied ${selected_categories.length} repair categor${selected_categories.length === 1 ? 'y' : 'ies'} successfully.`,
        ...result,
      });
    }

    if (action === 'copy_assets') {
      if (!source_branch_id || !target_branch_id) {
        return Response.json(
          { error: 'source_branch_id and target_branch_id are required' },
          { status: 400 }
        );
      }
      if (source_branch_id === target_branch_id) {
        return Response.json(
          { error: 'Source and destination branches must be different' },
          { status: 400 }
        );
      }
      if (!canUserAccessBranch(access, source_branch_id)) {
        return Response.json(
          { error: 'Forbidden: you do not have access to the selected source branch' },
          { status: 403 }
        );
      }
      if (!canUserAccessBranch(access, target_branch_id)) {
        return Response.json(
          { error: 'Forbidden: you do not have access to the selected destination branch' },
          { status: 403 }
        );
      }

      const [sourceBranch, targetBranch] = await Promise.all([
        svc.entities.Branch.get(source_branch_id).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
        svc.entities.Branch.get(target_branch_id).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
      ]);
      if (!sourceBranch || !targetBranch) {
        return Response.json({ error: 'Source or destination branch not found' }, { status: 404 });
      }

      const copyRes = await copyBranchEquipmentAndVehicles(svc, {
        sourceBranch,
        targetBranch,
        assetTypes: Array.isArray(asset_types) && asset_types.length ? asset_types : ['equipment', 'vehicles'],
        equipmentIds: equipment_ids,
        vehicleIds: vehicle_ids,
      });

      await audit(
        base44,
        user,
        'create',
        'CateringEquipment',
        `Copied ${copyRes.copied_equipment_count} equipment record(s) and ${copyRes.copied_vehicles_count} vehicle(s) from ${sourceBranch.name} to ${targetBranch.name}`,
        {
          entityName: `${sourceBranch.name} -> ${targetBranch.name}`,
          changes: copyRes,
        }
      );

      return Response.json({
        success: true,
        source_branch: { id: sourceBranch.id, name: sourceBranch.name },
        target_branch: { id: targetBranch.id, name: targetBranch.name },
        ...copyRes,
      });
    }

    if (action === 'mirror_inventory_items') {
      const ids = Array.isArray(inventory_item_ids) ? inventory_item_ids.filter(Boolean) : [];
      if (!ids.length) {
        return Response.json({ error: 'inventory_item_ids is required' }, { status: 400 });
      }
      const items = await svc.entities.InventoryItem.filter({ id: { $in: ids } }, '-created_date', ids.length);
      for (const item of items) {
        if (item.branch_id && !canUserAccessBranch(access, item.branch_id)) {
          return Response.json({ error: 'Forbidden: item belongs to an unauthorized branch' }, { status: 403 });
        }
      }
      const res = await mirrorInventoryItemAcrossBranches(svc, items);
      return Response.json({ success: true, ...res });
    }

    if (action === 'mirror_menu_item') {
      if (!menu_item_id) return Response.json({ error: 'menu_item_id is required' }, { status: 400 });
      const menuItem = await svc.entities.MenuItem.get(menu_item_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!menuItem) return Response.json({ error: 'Menu item not found' }, { status: 404 });
      if (menuItem.branch_id && !canUserAccessBranch(access, menuItem.branch_id)) {
        return Response.json({ error: 'Forbidden: menu item belongs to an unauthorized branch' }, { status: 403 });
      }
      const res = await mirrorMenuItemAcrossBranches(svc, menuItem, user.email || '');
      return Response.json({ success: true, ...res });
    }

    if (action === 'mirror_recipe') {
      if (!recipe_id) return Response.json({ error: 'recipe_id is required' }, { status: 400 });
      const recipe = await svc.entities.Recipe.get(recipe_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!recipe) return Response.json({ error: 'Recipe not found' }, { status: 404 });
      if (recipe.branch_id && !canUserAccessBranch(access, recipe.branch_id)) {
        return Response.json({ error: 'Forbidden: recipe belongs to an unauthorized branch' }, { status: 403 });
      }
      const res = await mirrorStandaloneRecipeAcrossBranches(svc, recipe, user.email || '');
      return Response.json({ success: true, ...res });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
    return Response.json({ error: error.message }, { status });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
