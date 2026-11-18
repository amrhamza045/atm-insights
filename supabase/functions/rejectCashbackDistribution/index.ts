import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

/**
 * Reject a pending cashback distribution.
 *
 * Same reasoning as approveCashbackDistribution: deciding the fate of a money
 * movement must not be a browser-trusted write. Rejection is less dangerous
 * than approval (it stops money rather than moving it) but it is the same
 * authorization boundary, so it sits behind the same payouts_approve flag.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await denyUnlessPermitted(base44, user, 'payouts_approve');
    if (denied) return denied;

    const { pending_id: pendingId, rejection_reason: rejectionReason } = await req.json();
    if (!pendingId) return Response.json({ error: 'pending_id is required' }, { status: 400 });
    if (!String(rejectionReason || '').trim())
      return Response.json({ error: 'rejection_reason is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const pending = await svc.entities.CashbackDistributionPending.get(pendingId).catch(() => null);
    if (!pending) return Response.json({ error: 'Pending distribution not found' }, { status: 404 });

    // Never reject something already paid out — that needs a reversal, not a reject.
    if (pending.status === 'executed')
      return Response.json({ error: 'Cannot reject: distribution already executed' }, { status: 409 });

    await svc.entities.CashbackDistributionPending.update(pendingId, {
      status: 'rejected',
      rejection_reason: String(rejectionReason).trim(),
    });

    await audit(base44, user, 'reject', 'CashbackDistribution',
      `Rejected cashback distribution: ${String(rejectionReason).trim()}`, { entityId: pendingId });
    return Response.json({ success: true, pending_id: pendingId, rejected_by: user.email });
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
