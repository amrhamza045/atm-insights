import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getCallerClient, isLoyaltyStaff } from '../_shared/callerClient.js';

// Referral screens read OTHER clients' purchases. This returns only what each
// screen displays — never whole Purchase records.
//  view "leaderboard": { buyer_ids, cashback_by_referrer }
//  view "client":      { referrals: {id: {total_spent, cashback_generated, purchase_count}}, referral_cashback: [...] }
//  view "network":     trimmed purchase rows where client_id is the referrer
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { view, client_id } = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;
    const purchases = await svc.entities.Purchase.list('-created_date', 10000);

    if (view === 'leaderboard') {
      const cashback_by_referrer = {};
      purchases.forEach((p) => {
        if (p.referrer_id) cashback_by_referrer[p.referrer_id] = (cashback_by_referrer[p.referrer_id] || 0) + (p.cashback_earned || 0);
      });
      return Response.json({ buyer_ids: [...new Set(purchases.map((p) => p.client_id).filter(Boolean))], cashback_by_referrer });
    }

    if (!client_id || !['client', 'network'].includes(view)) return Response.json({ error: 'view and client_id are required' }, { status: 400 });
    if (!isLoyaltyStaff(user)) {
      const own = await getCallerClient(svc, user);
      if (own?.id !== client_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (view === 'client') {
      const refs = await svc.entities.Client.filter({ referred_by: client_id });
      const referrals = Object.fromEntries(refs.map((r) => [r.id, { total_spent: 0, cashback_generated: 0, purchase_count: 0 }]));
      purchases.forEach((p) => {
        const r = referrals[p.client_id];
        if (!r) return;
        r.total_spent += p.amount || 0;
        r.cashback_generated += p.cashback_earned || 0;
        r.purchase_count += 1;
      });
      const referral_cashback = purchases
        .filter((p) => p.referrer_id === client_id && p.cashback_earned > 0)
        .map((p) => ({ id: p.id, client_name: p.client_name, cashback_earned: p.cashback_earned, created_date: p.created_date }));
      return Response.json({ referrals, referral_cashback });
    }

    // network: the purchase-history "my network" tab
    const network = purchases.filter((p) => p.referrer_id === client_id);
    const [submissions, clients] = await Promise.all([
      svc.entities.PurchaseSubmission.filter({ status: 'approved' }),
      svc.entities.Client.list('-created_date', 10000),
    ]);
    const byId = new Map(clients.map((c) => [c.id, c]));
    const levelOf = (id) => {
      let level = 0; let cur = id;
      while (cur && level < 3) {
        const c = byId.get(cur);
        if (!c?.referred_by) break;
        level++;
        if (c.referred_by === client_id) return level;
        cur = c.referred_by;
      }
      return 0;
    };
    const rows = network.map((p) => {
      const day = new Date(p.created_date).toDateString();
      const fromClient = submissions.some((s) => s.client_id === p.client_id && Math.abs(s.amount - p.amount) < 0.01
        && new Date(s.created_date).toDateString() === day);
      return {
        id: p.id, client_id: p.client_id, client_name: p.client_name, amount: p.amount || 0,
        cashback_earned: p.cashback_earned || 0, cashback_rate: p.cashback_rate, created_date: p.created_date,
        submittedBy: fromClient ? 'client' : 'admin', client_phone: byId.get(p.client_id)?.phone || '', client_level: levelOf(p.client_id),
      };
    });
    return Response.json({ purchases: rows });
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
