import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { executeBranchInventoryTransfer } from '../_shared/branchInventoryTransfer.js';
import { audit } from '../_shared/auditLog.js';

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await denyUnlessPermitted(base44, user, [
      'inventory_edit',
      'menu_edit',
      'admin_systems',
      'admin_settings',
    ]);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const { source_branch_id, target_branch_id, dry_run = false } = body;

    if (!source_branch_id || !target_branch_id) {
      return Response.json(
        { error: 'source_branch_id and target_branch_id are required' },
        { status: 400 }
      );
    }

    const result = await executeBranchInventoryTransfer(base44.asServiceRole, {
      sourceBranchId: source_branch_id,
      targetBranchId: target_branch_id,
      dryRun: dry_run === true,
    });

    if (dry_run !== true) {
      await audit(
        base44,
        user,
        'create',
        'InventoryItem',
        `Coded ${result.copied_inventory_count} inventory item definition(s) from ${result.source_branch?.name} into ${result.target_branch?.name} (with 0 stock) and verified ${result.relinked_ingredients_count} recipe ingredient link(s)`,
        {
          entityName: `${result.source_branch?.name} -> ${result.target_branch?.name}`,
          changes: {
            source_branch_id,
            target_branch_id,
            copied_inventory_count: result.copied_inventory_count,
            already_in_target_count: result.already_in_target_count,
            updated_menu_items_count: result.updated_menu_items_count,
            relinked_ingredients_count: result.relinked_ingredients_count,
            created_recipes_count: result.created_recipes_count,
            updated_recipes_count: result.updated_recipes_count,
            unresolved_ingredients_count: result.unresolved_ingredients_count,
          },
        }
      );
    }

    return Response.json(result);
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
