import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../_shared/platformRole.js';

// body: { event_id, decision: 'approve' | 'send_back', reason? }
// approve: authorises and stamps the approval; the caller then commits the reservation.
// send_back: returns the event to "none" so nothing is reserved.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['approve', 'send_back'].includes(body.decision)) return Response.json({ error: 'Choose approve or send back' }, { status: 400 });

    const permissions = await getEffectivePermissions(base44, user);
    const central = isCentralAdmin(user, permissions);
    if (!central && (!permissions || permissions.access_denied || permissions.catering_reservation_approve !== true))
      return Response.json({ error: 'Forbidden: requires the Catering Reservation Approval permission' }, { status: 403 });

    const event = await svc.entities.CateringEvent.get(body.event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    if (event.reservation_status !== 'pending_approval')
      return Response.json({ error: 'This reservation has already been decided' }, { status: 409 });

    if (body.decision === 'send_back') {
      const reason = String(body.reason || '').slice(0, 1000) || 'Sent back by the approver';
      await svc.entities.CateringEvent.update(event.id, {
        reservation_status: 'none',
        reservation_rejection_reason: reason,
        reservation_approved_by: '',
        reservation_approved_date: '',
      });
      audit(base44, user, 'catering_reservation_sent_back', 'CateringEvent', `Sent back reservation for ${event.event_name}: ${reason}`, { entityId: event.id }).catch(() => {});
      return Response.json({ ok: true });
    }

    await svc.entities.CateringEvent.update(event.id, {
      reservation_approved_by: user.email,
      reservation_approved_date: new Date().toISOString(),
      reservation_rejection_reason: '',
    });
    audit(base44, user, 'catering_reservation_approved', 'CateringEvent', `Approved reservation for ${event.event_name}`, { entityId: event.id }).catch(() => {});
    return Response.json({ ok: true, approved_by: user.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
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
