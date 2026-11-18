import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';

/**
 * Adds an approved balance recharge to an OPEN cashier session's recharge totals.
 * Requires admin_actions (platform admins pass). Totals are incremented server-side
 * from the stored session, never taken from the caller.
 * Body: { session_id, payment_method, amount }
 */
async function handler(req: Request): Promise<Response> {
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
