import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

/**
 * Approve a pending cashback distribution, then execute it.
 *
 * Approval used to be a plain frontend write to CashbackDistributionPending
 * (status -> 'approved'), which meant the approval gate was client-trusted and
 * therefore forgeable — making the admin check inside executeCashbackDistribution
 * pointless. Approval now happens here, behind payouts_approve.
 *
 * Execution is invoked with the service role on purpose: this endpoint IS the
 * authorization boundary, so a payouts_approve holder who is not a platform
 * admin can still complete the approve-and-execute flow they are trusted with.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await denyUnlessPermitted(base44, user, 'payouts_approve');
    if (denied) return denied;

    const { pending_id: pendingId } = await req.json();
    if (!pendingId) return Response.json({ error: 'pending_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const pending = await svc.entities.CashbackDistributionPending.get(pendingId).catch(() => null);
    if (!pending) return Response.json({ error: 'Pending distribution not found' }, { status: 404 });

    if (pending.status !== 'pending_approval' && pending.status !== 'approved') {
      return Response.json(
        { error: `Cannot approve: status is ${pending.status}` },
        { status: 409 }
      );
    }

    if (pending.status !== 'approved') {
      await svc.entities.CashbackDistributionPending.update(pendingId, {
        status: 'approved',
        approved_by: user.email,
      });
    }

    const executed = await svc.functions.invoke('executeCashbackDistribution', { pending_id: pendingId });
    await audit(base44, user, 'approve', 'CashbackDistribution', 'Approved cashback distribution', { entityId: pendingId });

    return Response.json({
      success: true,
      pending_id: pendingId,
      approved_by: user.email,
      execution: executed?.data ?? null,
    });
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
