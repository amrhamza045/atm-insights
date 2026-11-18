import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { syncMenuRecipeToManufacturing } from '../../shared/menuRecipeSync.js';
import { loadConversionRules } from '../../shared/unitConversion.js';
import { validateRecipeBranchIsolation } from '../../shared/branchInventoryTransfer.js';
import { mirrorMenuItemAcrossBranches } from '../../shared/branchCatalogMirror.js';
import { audit } from '../../shared/auditLog.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await denyUnlessPermitted(base44, user, ['menu_edit', 'manufacturing_edit']);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const { menu_item_id, recipe, total_cost, sync_all = false, branch_id = null, branch_name = null } = body;
    const svc = base44.asServiceRole;

    if (sync_all) {
      const [items, allInv, allRecipes, unitRules] = await Promise.all([
        svc.entities.MenuItem.list('-created_date', 500),
        svc.entities.InventoryItem.list('-created_date', 1000),
        svc.entities.Recipe.filter({}),
        loadConversionRules(svc),
      ]);
      const invById = new Map(allInv.map((i) => [i.id, i]));
      const recipesByMenuId = new Map(allRecipes.filter((r) => r.menu_item_id).map((r) => [r.menu_item_id, r]));
      const context = { branch_id, branch_name, allInv, invById, allRecipes, recipesByMenuId, unitRules };

      const withRecipes = items.filter((m) => Array.isArray(m.recipe) && m.recipe.length > 0);
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const item of withRecipes) {
        try {
          const res = await syncMenuRecipeToManufacturing(svc, item, user.email || '', context);
          if (res?.synced === true) {
            if (res.action === 'created') createdCount++;
            else updatedCount++;
          } else {
            skippedCount++;
          }
        } catch (_err) {
          failedCount++;
        }
      }

      const syncedCount = createdCount + updatedCount;
      await audit(base44, user, 'update', 'Recipe', `Synchronized ${syncedCount} menu item recipe(s) to Manufacturing (${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed)`, {});
      return Response.json({
        success: true,
        synced_count: syncedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
        total_checked: withRecipes.length,
      });
    }

    if (!menu_item_id) {
      return Response.json({ error: 'menu_item_id is required' }, { status: 400 });
    }

    let menuItem = await svc.entities.MenuItem.get(menu_item_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!menuItem) {
      return Response.json({ error: 'Menu item not found' }, { status: 404 });
    }

    if (Array.isArray(recipe)) {
      const cleaned = recipe
        .filter((r) => r && r.inventory_item_id)
        .map((r) => ({
          inventory_item_id: r.inventory_item_id,
          inventory_item_name: r.inventory_item_name || '',
          category_id: r.category_id || '',
          quantity_needed: Number(r.quantity_needed) || 0,
          unit: r.unit || '',
        }));

      const effectiveBranchId = menuItem.branch_id || branch_id || null;
      const effectiveBranchName = menuItem.branch_name || branch_name || '';
      if (effectiveBranchId && cleaned.length > 0) {
        const ids = [...new Set(cleaned.map((r) => r.inventory_item_id))];
        const invItems = await svc.entities.InventoryItem.filter({ id: { $in: ids } }, '-created_date', ids.length);
        const invById = new Map((invItems || []).map((i) => [i.id, i]));
        const check = validateRecipeBranchIsolation(cleaned, invById, effectiveBranchId, effectiveBranchName);
        if (!check.ok) {
          return Response.json(
            {
              error: check.violations[0].reason,
              violations: check.violations,
            },
            { status: 400 }
          );
        }
      }

      const patch = { recipe: cleaned };
      if (total_cost !== undefined && total_cost !== null && !Number.isNaN(Number(total_cost))) {
        patch.total_cost = Math.round(Number(total_cost) * 100) / 100;
      }
      menuItem = await svc.entities.MenuItem.update(menu_item_id, patch);
    }

    const result = await syncMenuRecipeToManufacturing(svc, menuItem, user.email || '', { branch_id, branch_name });
    const latestMenu = await svc.entities.MenuItem.get(menuItem.id).catch(() => menuItem);
    const mirrorResult = await mirrorMenuItemAcrossBranches(svc, latestMenu || menuItem, user.email || '').catch(() => ({ created_count: 0, updated_count: 0 }));
    await audit(base44, user, 'update', 'MenuItem', `Saved recipe for ${menuItem.name} and synced to Manufacturing`, {
      entityId: menuItem.id,
      entityName: menuItem.name,
    });

    return Response.json({
      success: true,
      menu_item_id: menuItem.id,
      mirrored_branches_count: (mirrorResult?.created_count || 0) + (mirrorResult?.updated_count || 0),
      ...result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}