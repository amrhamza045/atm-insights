import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkPermission } from '../../shared/requirePermission.js';

/**
 * Adds an approved balance recharge to an OPEN cashier session's recharge totals.
 * Requires admin_actions (platform admins pass). Totals are incremented server-side
 * from the stored session, never taken from the caller.
 * Body: { session_id, payment_method, amount }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const c = await checkPermission(base44, user, 'admin_actions');
    if (!c.allowed) return Response.json({ error: c.reason }, { status: c.status });

    const { session_id, payment_method, amount } = await req.json();
    const value = Number(amount);
    if (!session_id || !Number.isFinite(value) || value <= 0)
      return Response.json({ error: 'session_id and a positive amount are required' }, { status: 400 });

    const svc = base44.asServiceRole.entities.CashierSession;
    const session = await svc.get(session_id);
    if (!session || session.status !== 'open')
      return Response.json({ error: 'Cashier session is not open' }, { status: 409 });

    const field = payment_method === 'cash' ? 'new_recharge_cash' : 'new_recharge_visa';
    const updated = await svc.update(session_id, {
      [field]: (session[field] || 0) + value,
      total_new_recharge: (session.total_new_recharge || 0) + value,
    });
    return Response.json({ session: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}