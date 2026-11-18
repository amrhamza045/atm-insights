import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getCallerClient } from '../_shared/callerClient.js';

// A client asks to recharge their balance. Always created as "pending";
// cashback/credit are left for the approver.
const METHODS = ['cash', 'visa', 'bank_transfer', 'instapay'];

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;

    const client = await getCallerClient(svc, user);
    if (!client) return Response.json({ error: 'No client profile for this account' }, { status: 403 });

    const amount = Number(body.amount_paid);
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'Please enter a valid amount' }, { status: 400 });
    if (!METHODS.includes(body.payment_method)) return Response.json({ error: 'Invalid payment method' }, { status: 400 });

    const recharge = await svc.entities.BalanceRecharge.create({
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      amount_paid: amount,
      payment_method: body.payment_method,
      payment_receipt_url: typeof body.payment_receipt_url === 'string' ? body.payment_receipt_url : null,
      status: 'pending',
    });
    return Response.json({ recharge });
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
