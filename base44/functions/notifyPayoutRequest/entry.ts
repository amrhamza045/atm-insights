import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { usersWithPermission } from '../../shared/permissionRecipients.js';
import { loadBrandName } from '../../shared/brand.js';

// Emails everyone holding payouts_approve about a new pending payout request.
// Details are read from the stored Payout, never from the caller.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { payout_id } = await req.json();
    if (!payout_id) return Response.json({ error: 'payout_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const payout = await svc.entities.Payout.get(payout_id).catch(() => null);
    if (!payout) return Response.json({ error: 'Payout not found' }, { status: 404 });
    // Payouts are now created by submitPayoutRequest (elevated), so match on the caller's client.
    const ownClient = (await svc.entities.Client.filter({ email: user.email }))[0];
    if (payout.created_by_id !== user.id && payout.client_id !== ownClient?.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if ((payout.status || 'pending') !== 'pending') return Response.json({ success: true, notified: 0, reason: 'not_pending' });

    const recipients = await usersWithPermission(svc, 'payouts_approve');
    const brand = await loadBrandName(base44);
    for (const r of recipients) {
      await svc.integrations.Core.SendEmail({
        from_name: brand,
        to: r.email,
        subject: `${brand} Partner: New Payout Request`,
        body: `A new payout request has been submitted by ${payout.client_name || 'a client'} for £${payout.amount} via ${payout.payment_method}.`
      }).catch(() => null);
    }
    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}