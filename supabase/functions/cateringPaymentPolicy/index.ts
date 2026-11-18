import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../_shared/platformRole.js';
import { hasPolicy } from '../_shared/paymentPolicyEvent.js';
import { bookEvent } from '../_shared/paymentPolicyBooking.js';
import { policyView, refreshEvent } from '../_shared/paymentPolicyRefresh.js';
import { pendingBookings, decideBooking } from '../_shared/paymentPolicyApproval.js';

const has = (permissions, keys) => keys.some((k) => permissions?.[k] === true);
const forbidden = (error) => Response.json({ error }, { status: 403 });

/**
 * Payment policies on catering events (Catering › Settings › Payment Policies).
 *  book    { event }                    books a new event under the active policy for its window (catering edit)
 *  refresh { event_id }                 re-applies the policy after a reschedule, rebuilds the deposit (catering edit / finance)
 *  status  { event_id }                 the policy, its payment steps and what blocks the event (catering access)
 *  pending {}                           bookings waiting for the caller (Booking Approvals + the policy's approver role)
 *  decide  { event_id, decision, note } approve or reject a booking (Booking Approvals on the policy's approver role, or a central admin)
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const permissions = await getEffectivePermissions(base44, user);
    const central = isCentralAdmin(user, permissions);
    if (!central && (!permissions || permissions.access_denied)) return forbidden('Forbidden');
    const ctx = { base44, svc: base44.asServiceRole, user, permissions: permissions || {}, central };
    const inBranch = (branchId) => central || !ctx.permissions.branch_id || ctx.permissions.branch_id === branchId;

    if (body.action === 'book') {
      if (!central && !has(permissions, ['catering_edit'])) return forbidden('Forbidden: requires catering edit access');
      if (!inBranch(body.event?.branch_id)) return forbidden('Forbidden: you can only book events for your branch');
      return Response.json(await bookEvent(ctx, body.event || {}));
    }
    if (body.action === 'pending') return Response.json(await pendingBookings(ctx));

    if (!body.event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    const event = await ctx.svc.entities.CateringEvent.get(body.event_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!inBranch(event.branch_id)) return forbidden('Forbidden: this event belongs to another branch');
    if (!hasPolicy(event)) return Response.json({ policy: null });

    if (body.action === 'status') {
      if (!central && !has(permissions, ['catering_view', 'catering_edit', 'catering_finance'])) return forbidden('Forbidden: requires catering access');
      return Response.json(await policyView(ctx, event));
    }
    if (body.action === 'refresh') {
      if (!central && !has(permissions, ['catering_edit', 'catering_finance'])) return forbidden('Forbidden: requires catering edit or finance access');
      return Response.json(await refreshEvent(ctx, event));
    }
    if (body.action === 'decide') return Response.json(await decideBooking(ctx, event, body));
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status || 500 });
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
