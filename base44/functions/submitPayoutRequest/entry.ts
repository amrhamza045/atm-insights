import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getCallerClient } from '../../shared/callerClient.js';
import { getCompanyOffset, periodStart, TIMEZONE_MISSING } from '../../shared/companyTimezone.js';

// A client asks to withdraw. The status is decided here, never by the caller:
// "pending", or "rejected" with a reason when a withdrawal limit is exceeded
// (same behaviour the screen had). Limits/minimum come from Payout settings
// and the client's own limits; enabled methods from Payment Method settings.
const METHOD_FLAG = {
  bank_transfer: 'bank_transfer_enabled', paypal: 'paypal_enabled', cash: 'cash_enabled',
  instapay_transfer: 'instapay_enabled', wallet_transfer: 'wallet_enabled',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;

    const client = await getCallerClient(svc, user);
    if (!client) return Response.json({ error: 'No client profile for this account' }, { status: 403 });

    const amount = Number(body.amount);
    const details = String(body.payment_details || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'Please enter a valid amount' }, { status: 400 });
    if (!METHOD_FLAG[body.payment_method]) return Response.json({ error: 'Invalid payment method' }, { status: 400 });
    if (!details) return Response.json({ error: 'Please provide payment details' }, { status: 400 });

    const [payoutSettings, methodSettings] = await Promise.all([
      svc.entities.SystemSettings.filter({ setting_key: 'payout_settings' }).then((r) => r[0] || {}),
      svc.entities.SystemSettings.filter({ setting_key: 'payment_methods' }).then((r) => r[0] || {}),
    ]);
    if (methodSettings[METHOD_FLAG[body.payment_method]] === false) return Response.json({ error: 'This payment method is disabled' }, { status: 400 });
    if (payoutSettings.min_payout_amount && amount < payoutSettings.min_payout_amount) {
      return Response.json({ error: `Minimum payout amount is ${payoutSettings.min_payout_amount}` }, { status: 400 });
    }
    if (amount > (client.available_payout || 0)) return Response.json({ error: 'Amount is more than your available payout' }, { status: 400 });

    const limits = [
      ['Daily', client.daily_withdrawal_limit ?? payoutSettings.default_daily_withdrawal_limit, 'day'],
      ['Weekly', client.weekly_withdrawal_limit ?? payoutSettings.default_weekly_withdrawal_limit, 'week'],
      ['Monthly', client.monthly_withdrawal_limit ?? payoutSettings.default_monthly_withdrawal_limit, 'month'],
    ];
    const tzOffset = await getCompanyOffset(svc.entities);
    if (limits.some(([, limit]) => limit) && tzOffset === null) return Response.json({ error: TIMEZONE_MISSING }, { status: 409 });
    const completed = (await svc.entities.Payout.filter({ client_id: client.id, status: 'completed' }));
    let rejection = null;
    for (const [label, limit, kind] of limits) {
      if (!limit) continue;
      const from = periodStart(tzOffset, kind);
      const used = completed.filter((p) => new Date(p.created_date).getTime() >= from).reduce((s, p) => s + (p.amount || 0), 0);
      if (used + amount > limit) { rejection = `${label} withdrawal limit of ${limit} exceeded (already withdrawn ${used.toFixed(2)})`; break; }
    }

    const payout = await svc.entities.Payout.create({
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      amount,
      payment_method: body.payment_method,
      payment_details: details,
      status: rejection ? 'rejected' : 'pending',
      ...(rejection ? { rejection_reason: rejection } : {}),
    });
    return Response.json({ payout });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}