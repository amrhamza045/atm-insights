import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  const denied = await denyUnlessPermitted(base44, user, ['purchase_edit']);
  if (denied) return denied;

  const { request_id, action, purchase_order_id, note } = await req.json();
  const db = base44.asServiceRole.entities;
  const request = request_id ? await db.KitchenPurchaseRequest.get(request_id).catch(() => null) : null;
  if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });

  const stamp = { handled_by: user.email, handled_at: new Date().toISOString() };
  if (note) stamp.resolution_note = String(note).slice(0, 1000);

  if (action === 'link_po') {
    const po = purchase_order_id ? await db.PurchaseOrder.get(purchase_order_id).catch(() => null) : null;
    if (!po) return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    if (!(po.items || []).some((i) => i.inventory_item_id === request.inventory_item_id))
      return Response.json({ error: 'That purchase order does not include this item' }, { status: 400 });
    await db.KitchenPurchaseRequest.update(request.id, {
      ...stamp, status: 'po_linked', purchase_order_id: po.id, purchase_order_number: po.order_number,
    });
  } else if (['received', 'resolved', 'cancelled', 'open'].includes(action)) {
    await db.KitchenPurchaseRequest.update(request.id, { ...stamp, status: action });
  } else {
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  }
  return Response.json({ ok: true });
});
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
