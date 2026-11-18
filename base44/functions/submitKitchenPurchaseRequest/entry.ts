import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { computeShortages, resolveOrderRecipeStrict } from '../../shared/recipeNesting.js';
import { eventItemLocalizer } from '../../shared/branchStock.js';

const ACTIVE_REQ = ['open', 'po_linked'];
const OPEN_PO = ['recommended', 'pending_approval', 'pending', 'confirmed', 'shipped'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, ['manufacturing_view', 'manufacturing_edit']);
    if (denied) return denied;

    const { production_order_id, mode = 'preview', note } = await req.json().catch(() => ({}));
    if (!production_order_id) return Response.json({ error: 'production_order_id is required' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const order = await db.ProductionOrder.get(production_order_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!order) return Response.json({ error: 'Production order not found' }, { status: 404 });

    const resolution = await resolveOrderRecipeStrict(db, order);
    if (!resolution.recipe) {
      return Response.json({ error: resolution.error, code: resolution.source }, { status: 400 });
    }
    const recipe = resolution.recipe;
    const batches = order.target_quantity || 1;

    // Recompute shortages server-side — the client list is never trusted.
    // Includes raw materials needed to produce any short sub-recipe items.
    // For event-linked catering batches, checks event-specific kitchen custody rather than general stock.
    const eventId = order.order_source === 'catering' && order.catering_event_id ? order.catering_event_id : null;
    // Each branch cooks from its own stock: shortages name the event branch's own items.
    const localize = eventId ? await eventItemLocalizer(db, eventId, order.branch_id) : null;
    let shortages, subShortages;
    try {
      ({ shortages, subShortages } = await computeShortages(db, recipe, batches, order.id, eventId, localize));
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    // Child batches already queued for this order (avoid duplicates).
    const children = await db.ProductionOrder.filter({ parent_production_order_id: production_order_id, status: { $in: ['pending', 'in_progress'] } });
    for (const s of subShortages) s.existing_order = children.find((c) => c.recipe_id === s.sub_recipe_id) || null;

    if (mode === 'create_sub_orders') {
      const toMake = subShortages.filter((s) => !s.existing_order);
      const subRecipes = await Promise.all(toMake.map((s) => db.Recipe.get(s.sub_recipe_id).catch(() => null)));
      const created = toMake.map((s, i) => ({
        recipe_id: s.sub_recipe_id, recipe_name: s.sub_recipe_name,
        output_item_id: s.inventory_item_id, output_item_name: s.inventory_item_name,
        output_unit: subRecipes[i]?.output_unit || s.unit,
        target_quantity: s.sub_batches,
        required_output_quantity: s.quantity_missing,
        status: 'pending', branch_id: order.branch_id, branch_name: order.branch_name,
        order_source: order.order_source || 'regular',
        catering_event_id: order.catering_event_id, catering_event_name: order.catering_event_name,
        needed_by_date: order.needed_by_date,
        parent_production_order_id: production_order_id, parent_recipe_name: order.recipe_name,
        production_stage: 'sub_recipe',
        notes: `Sub-recipe batch for ${order.recipe_name}${s.via ? ` (via ${s.via})` : ''}`,
      }));
      if (created.length) await db.ProductionOrder.bulkCreate(created);
      return Response.json({ created: created.length });
    }

    const existing = await db.KitchenPurchaseRequest.filter({ production_order_id, status: { $in: ACTIVE_REQ } });
    const poQuery = { status: { $in: OPEN_PO } };
    if (order.branch_id) poQuery.branch_id = order.branch_id;
    const openPos = await db.PurchaseOrder.filter(poQuery, '-created_date', 200);

    for (const s of shortages) {
      s.existing_request = existing.find((r) => r.inventory_item_id === s.inventory_item_id) || null;
      s.open_pos = openPos
        .filter((po) => (po.items || []).some((i) => i.inventory_item_id === s.inventory_item_id))
        .map((po) => ({
          id: po.id, order_number: po.order_number, status: po.status, supplier: po.supplier,
          catering_event_name: po.catering_event_name,
          same_event: !!order.catering_event_id && (po.catering_event_id === order.catering_event_id || (po.catering_event_ids || []).includes(order.catering_event_id)),
        }));
    }

    if (mode !== 'submit') return Response.json({ order, shortages, sub_shortages: subShortages });

    const now = new Date().toISOString();
    const toCreate = shortages.filter((s) => !s.existing_request).map((s) => ({
      branch_id: order.branch_id, branch_name: order.branch_name,
      production_order_id, recipe_name: order.recipe_name, batches,
      catering_event_id: order.catering_event_id, catering_event_name: order.catering_event_name,
      needed_by_date: order.needed_by_date,
      inventory_item_id: s.inventory_item_id, inventory_item_name: s.inventory_item_name,
      quantity_needed: s.quantity_needed, quantity_available: s.quantity_available,
      quantity_requested: s.quantity_requested, unit: s.unit,
      note: note ? String(note).slice(0, 1000) : undefined,
      status: 'open', requested_by: user.email, requested_at: now,
    }));
    if (toCreate.length) await db.KitchenPurchaseRequest.bulkCreate(toCreate);
    return Response.json({ created: toCreate.length, skipped: shortages.length - toCreate.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}