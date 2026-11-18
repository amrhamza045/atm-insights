import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { isAutoApproveOn } from '../_shared/autoApproval.js';
import { holdsSelfApprovalBypass } from '../_shared/selfApprovalBypass.js';
import { authorizeFinanceOnEvent, round2, fmtEGP } from '../_shared/cateringPaymentPosting.js';
import { checkExcess, pricedByUser } from '../_shared/depositWithdrawal.js';

import { capturePaymentAccounts } from '../_shared/cateringConfiguredPayment.js';

// Creates a pending withdrawal request. Nothing is posted until approveDepositWithdrawal.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const auth = await authorizeFinanceOnEvent(base44, body.event_id);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const { user, event, central } = auth;
    const svc = base44.asServiceRole;

    const value = round2(body.amount);
    if (value <= 0) return Response.json({ error: 'Withdrawal amount must be greater than zero' }, { status: 400 });
    const method = body.payment_method;

    const check = await checkExcess(svc, event, value);
    if (check.error) return Response.json(check, { status: 400 });
    const bypass = await holdsSelfApprovalBypass(svc, user);
    if (!central && !bypass && await pricedByUser(svc, event, user.email))
      return Response.json({ error: 'You priced this event — a second Catering Manager or an admin must withdraw the deposit.' }, { status: 403 });

    const partial = value < check.excess;
    const routing = await capturePaymentAccounts(svc,event,{payment_type:'deposit_withdrawal',payment_method:method});
    const payment = await svc.entities.CateringPayment.create({
      ...routing,
      branch_id: event.branch_id,
      branch_name: event.branch_name || '',
      event_id: event.id,
      event_name: event.event_name,
      quote_id: event.active_quote_id || '',
      client_id: event.client_id,
      client_name: event.client_name || '',
      payment_type: 'deposit_withdrawal',
      source: 'catering',
      amount: value,
      payment_method: method,
      status: 'pending',
      payment_date: new Date().toISOString(),
      reference: body.reference || '',
      receipt_url: body.receipt_url || '',
      recorded_by: user.email,
      recorded_by_id: user.id,
      notes: partial
        ? `Partial excess deposit withdrawal — ${fmtEGP(round2(check.excess - value))} excess stays on deposit`
        : 'Full excess deposit withdrawal',
    });

    await audit(base44, user, 'create', 'CateringPayment',
      `Requested ${fmtEGP(value)} excess deposit withdrawal on ${event.event_name} (pending approval)`,
      { entityId: payment.id, entityName: event.event_name });
    // Auto-approval runs the normal approval as the requester; any refusal leaves it pending.
    const auto = (bypass || await isAutoApproveOn(svc)) && await base44.functions.invoke('approveDepositWithdrawal', { payment_id: payment.id, decision: 'approve', auto: true }).catch(() => null);
    if (auto?.data?.approved) return Response.json({ payment, pending: false, auto_approved: true });
    return Response.json({ payment, pending: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
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
