import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { sendWhatsApp } from '../_shared/twilioWhatsApp.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const denied = await denyUnlessPermitted(base44, user, ['cashback_dist_approve', 'payouts_approve', 'admin_actions']);
    if (denied) return denied;

    const { cashback_transaction_id } = await req.json();

    if (!cashback_transaction_id) {
      return Response.json({ error: 'cashback_transaction_id is required' }, { status: 400 });
    }

    // Get the cashback transaction
    const transactions = await base44.asServiceRole.entities.CashbackTransaction.filter({ id: cashback_transaction_id });
    const tx = transactions[0];

    if (!tx || tx.transaction_type !== 'referral_cashback') {
      return Response.json({ skipped: true, reason: 'Not a referral cashback transaction' });
    }

    // Get the referrer (source_client_id)
    const referrer = tx.source_client_id
      ? (await base44.asServiceRole.entities.Client.filter({ id: tx.source_client_id }))[0]
      : null;

    // Get the referred client
    const referred = (await base44.asServiceRole.entities.Client.filter({ id: tx.client_id }))[0];

    if (!referred) {
      return Response.json({ skipped: true, reason: 'Referred client not found' });
    }

    if (!referrer?.phone) {
      return Response.json({ skipped: true, reason: 'Referrer has no phone number' });
    }

    const formatCurrency = (amount) => `${parseFloat(amount || 0).toFixed(2)} EGP`;

    // Build notification message
    const message = [
      `🎉 *كاش باك من الإحالة!*`,
      ``,
      `*العميل المحال:* ${referred.name}`,
      `*المبلغ المكتسب:* ${formatCurrency(tx.cashback_amount || tx.amount)}`,
      `*النسبة:* ${tx.cashback_rate || 'N/A'}%`,
      `*المستوى:* ${tx.referral_level || 1}`,
      tx.purchase_amount ? `*قيمة الطلب:* ${formatCurrency(tx.purchase_amount)}` : '',
      ``,
      `_شكرًا لكونك جزء من GenMo — كل ما شبكتك تكبر، مكسبك يزيد!_`,
    ].filter(Boolean).join('\n');

    // Send WhatsApp to referrer
    const sent = await sendWhatsApp({ phone_number: referrer.phone, message });
    if (!sent.ok) return Response.json(sent.body, { status: sent.status });

    return Response.json({
      success: true,
      transaction_id: tx.id,
      referrer: referrer.name,
      referred: referred.name,
      amount: tx.cashback_amount || tx.amount,
      whatsapp_sent: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
