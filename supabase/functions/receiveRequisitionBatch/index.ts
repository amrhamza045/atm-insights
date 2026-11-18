import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { openRequisitionAction, staleResponse, errorResponse } from '../_shared/requisitionAccess.js';
import { appendRevision } from '../_shared/requisitionTrail.js';
import { notifyRequisition } from '../_shared/requisitionNotify.js';

/**
 * Chef receipt of a released batch. Body: { requisition_id, revision, slip_id, comment? }.
 * Needs requisition_submit (Roles tab + per-user overrides only), the requisition's branch and the revision on screen;
 * only a released batch can be received. Records received_by / received_date / the comment on the slip and writes a
 * "batch_received" revision. No stock moves.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_submit');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor, user } = ctx;
    const stale = staleResponse(requisition, body.revision);
    if (stale) return stale;
    const slip = body.slip_id ? await svc.entities.KitchenReleaseSlip.get(body.slip_id).catch(() => null) : null;
    if (!slip || slip.requisition_id !== requisition.id || !slip.is_requisition_batch)
      return Response.json({ error: 'Batch not found on this requisition' }, { status: 404 });
    if (slip.status === 'scheduled') return Response.json({ error: `Batch ${slip.batch_number} hasn't been released yet` }, { status: 409 });
    if (slip.status !== 'released') return Response.json({ error: `Batch ${slip.batch_number} is ${slip.status} — only a released batch can be received` }, { status: 409 });

    const comment = String(body.comment || '').trim().slice(0, 1000);
    const now = new Date().toISOString();
    await appendRevision(svc, requisition, {
      side: 'chef', action: 'batch_received', ...actor,
      comment: [`Batch ${slip.batch_number} (${slip.slip_number}) received`, comment].filter(Boolean).join(' — '),
      line_snapshots: (slip.lines || []).map((l) => ({
        line_id: l.requisition_line_id || '', inventory_item_name: l.inventory_item_name || '', line_type: l.line_type || 'planned',
        quantity_before: Number(l.quantity_reserved) || 0, quantity_after: Number(l.actual_quantity) || 0, decision: 'received', reason: '', comment: '',
      })),
    }, { last_action_by: actor.actor_name, last_action_date: now }, { current_revision: Number(body.revision) });
    await svc.entities.KitchenReleaseSlip.update(slip.id, {
      status: 'received', received_by: user.email || '', received_by_name: actor.actor_name, received_date: now, receipt_comment: comment,
    });
    const fresh = await svc.entities.Requisition.get(requisition.id);
    // Only a receipt with a comment (e.g. a shortage note) is worth telling Inventory about.
    const notification = comment ? await notifyRequisition(svc, requisition, 'batch_received', actor, { batch: slip.batch_number, comment }) : null;
    return Response.json({ requisition_id: requisition.id, slip_id: slip.id, status: 'received', current_revision: Number(fresh.current_revision) || 0, notification });
  } catch (error) {
    return errorResponse(error);
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
