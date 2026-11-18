import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { loadBrandName } from '../_shared/brand.js';
import { loadEmailConfig, sendAndLog } from '../_shared/emailDelivery.js';
import { welcomeEmail, tierUpgradeEmail } from '../_shared/accountEmailTemplates.js';

const norm = (v) => String(v || '').trim().toLowerCase();

/**
 * Customer account emails, built and sent once each on the server so Admin › Email
 * can switch them off and add people who get a copy.
 * type "welcome": { client_id } the caller's own new client account.
 * type "tier_upgrade": { client_id, previous_tier_id } after a client moves up a loyalty tier.
 */
async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { type, client_id: clientId, previous_tier_id: previousTierId } = await req.json().catch(() => ({}));
    if (type !== 'welcome' && type !== 'tier_upgrade') return Response.json({ error: 'Unknown email type' }, { status: 400 });
    if (!clientId) return Response.json({ error: 'client_id is required' }, { status: 400 });
    const svc = base44.asServiceRole;
    const client = await svc.entities.Client.get(clientId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
    const brand = await loadBrandName(base44, '');

    if (type === 'welcome') {
      if (client.created_by_id !== user.id && norm(client.email) !== norm(user.email)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const [bonus] = await svc.entities.CashbackTransaction.filter({ client_id: client.id, transaction_type: 'welcome_cashback' });
      return sendOnce(svc, 'registration_approved', client, client.id,
        welcomeEmail({ brand, name: client.name, referralCode: client.referral_code, welcomeCashback: Number(bonus?.amount) || 0 }));
    }

    const [tier, previous] = await Promise.all([
      client.current_tier_id ? svc.entities.CashbackTier.get(client.current_tier_id).catch(() => null) : null,
      previousTierId ? svc.entities.CashbackTier.get(previousTierId).catch(() => null) : null,
    ]);
    // Only a real move up: a different tier with a higher direct-referral rate.
    if (!tier || !previous || tier.id === previous.id
      || !(Number(tier.cashback_percentage_level1) > Number(previous.cashback_percentage_level1 || 0))) {
      return Response.json({ skipped: 'not an upgrade' });
    }
    const referrals = (await svc.entities.Client.filter({ referred_by: client.id })).length;
    return sendOnce(svc, 'tier_upgrade', client, `${client.id}:${tier.id}`,
      tierUpgradeEmail({ brand, name: client.name, previous, tier, referrals }));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function sendOnce(svc, key, client, contextId, email) {
  const config = await loadEmailConfig(svc);
  if (!config.on(key)) return Response.json({ skipped: 'turned off' });
  const earlier = await svc.entities.EmailSendLog.filter({ email_key: key, context_id: contextId, is_test: false });
  if (earlier.length) return Response.json({ skipped: 'already sent' });
  const to = await config.recipientsFor(key, client.email ? [client.email] : []);
  const result = await sendAndLog(svc, { key, to, ...email, context: client.name || client.email || '', context_id: contextId });
  return Response.json({ sent: result.sent.length, failed: result.failures.length });
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
