import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';

// Customer self-registration for the signed-in account. The profile always uses the
// account's own email; balances, referral code and referrer are set here, never by the browser.
// Body: { action: 'find_referrer', referral_code } | { full_name?, phone, address?, location_lat?,
//         location_lng?, registration_level_id?, referral_code? }

const norm = (s) => String(s || '').toLowerCase().trim();
const text = (v, max) => String(v ?? '').trim().slice(0, max);
const coord = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomPart = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => ALPHABET[b % 36]).join('');

async function findByCode(svc, code) {
  const wanted = text(code, 40).toUpperCase();
  if (!wanted) return null;
  const rows = await svc.entities.Client.filter({ referral_code: wanted });
  return rows.find((c) => !c.is_merged) || null;
}

// Direct referrals, whole network and depth below one client (what the sign-up form shows).
async function networkOf(svc, rootId) {
  let level = [rootId];
  let direct = 0, network = 0, depth = 0;
  for (let i = 0; i < 20 && level.length; i++) {
    const kids = await svc.entities.Client.filter({ referred_by: { $in: level } }, '-created_date', 5000);
    if (!kids.length) break;
    if (i === 0) direct = kids.length;
    network += kids.length;
    depth = i + 1;
    level = kids.map((k) => k.id);
  }
  return { direct, network, depth };
}

async function newReferralCode(svc, name) {
  const initials = name.split(' ').filter(Boolean).map((w) => w[0].toUpperCase()).join('').substring(0, 3) || 'CLI';
  for (let i = 0; i < 10; i++) {
    const code = `PRO-${initials}-${randomPart()}`;
    if (!(await svc.entities.Client.filter({ referral_code: code })).length) return code;
  }
  throw new Error('Could not create a referral code, please try again');
}

// Same tier rule the sign-up pages used.
function tierFor(directCount, tiers, levelId) {
  const forLevel = tiers.filter((t) => t.registration_level_id === levelId);
  if (!forLevel.length) return tiers.find((t) => t.is_default);
  const sorted = [...forLevel].sort((a, b) => b.min_referrals - a.min_referrals);
  return sorted.find((t) => directCount >= t.min_referrals) || forLevel.find((t) => t.is_default) || forLevel[0];
}

// The referrer and up to two levels above it move up a tier when the new referral earns it.
async function promoteChain(base44, svc, referrer, tiers) {
  let current = referrer;
  for (let i = 0; i < 3 && current; i++) {
    const direct = await svc.entities.Client.count({ referred_by: current.id });
    const newTier = tierFor(direct, tiers, current.registration_level_id);
    const oldTier = tiers.find((t) => t.id === current.current_tier_id);
    if (newTier && (!oldTier || newTier.id !== oldTier.id)) {
      await svc.entities.Client.update(current.id, { current_tier_id: newTier.id, current_tier_name: newTier.level_name });
      if (oldTier && newTier.cashback_percentage_level1 > (oldTier.cashback_percentage_level1 || 0) && current.email) {
        await base44.functions.invoke('sendAccountEmail', { type: 'tier_upgrade', client_id: current.id, previous_tier_id: oldTier.id })
          .catch((e) => console.error('Tier upgrade email could not be sent:', e?.message));
      }
    }
    if (!current.referred_by) break;
    current = await svc.entities.Client.get(current.referred_by).catch(() => null);
  }
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user?.email) return Response.json({ error: 'Please sign in first' }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.action === 'find_referrer') {
      const referrer = await findByCode(svc, body.referral_code);
      if (!referrer) return Response.json({ error: 'Referral code not found' }, { status: 404 });
      const n = await networkOf(svc, referrer.id);
      return Response.json({
        referrer: { name: referrer.name, referral_code: referrer.referral_code, direct_count: n.direct, network_count: n.network, depth: n.depth },
      });
    }

    const name = text(body.full_name || user.full_name, 120);
    const phone = text(body.phone, 30);
    if (!name || !phone) return Response.json({ error: 'Name and mobile number are required' }, { status: 400 });

    const email = user.email;
    const permRows = await svc.entities.UserPermissions.filter({ user_email: email });
    if (norm(email) !== email) permRows.push(...(await svc.entities.UserPermissions.filter({ user_email: norm(email) })));
    if (permRows.some((p) => norm(p.user_email) === norm(email) && p.login_disabled === true)) {
      await svc.entities.User.delete(user.id).catch(() => {});
      return Response.json({ error: 'This account has been disabled and cannot sign in.' }, { status: 403 });
    }
    const mine = await svc.entities.Client.filter({ email });
    if (norm(email) !== email) mine.push(...(await svc.entities.Client.filter({ email: norm(email) })));
    const existing = mine.find((c) => norm(c.email) === norm(email));
    if (existing) {
      return Response.json({ error: `A loyalty client with email "${email}" already exists (${existing.name}).` }, { status: 409 });
    }

    let referrer = null;
    if (text(body.referral_code, 40)) {
      referrer = await findByCode(svc, body.referral_code);
      if (!referrer) return Response.json({ error: 'Invalid or inactive referral code' }, { status: 400 });
    } else {
      const settings = await svc.entities.SystemSettings.list();
      const rootId = settings.find((s) => s.default_root_client_id)?.default_root_client_id;
      referrer = rootId ? await svc.entities.Client.get(rootId).catch(() => null) : null;
    }

    const levels = await svc.entities.RegistrationLevel.list('sort_order');
    const level = levels.find((l) => l.id === body.registration_level_id && l.is_active)
      || levels.find((l) => l.is_active) || levels[0];
    if (!level) return Response.json({ error: 'No registration level is set up yet' }, { status: 400 });

    const tiers = await svc.entities.CashbackTier.list('min_referrals');
    const defaultTier = tiers.find((t) => t.is_default) || tiers[0];
    const welcome = level.welcome_cashback_amount || 100;
    const referralCode = await newReferralCode(svc, name);

    const client = await svc.entities.Client.create({
      name,
      email,
      phone,
      address: text(body.address, 300) || undefined,
      location_lat: coord(body.location_lat),
      location_lng: coord(body.location_lng),
      client_source: 'web',
      referred_by: referrer?.id || undefined,
      referral_code: referralCode,
      status: 'active',
      loyalty_program_enrolled: true,
      current_tier_id: defaultTier?.id,
      current_tier_name: defaultTier?.level_name,
      cashback_earned: welcome,
      available_payout: 0,
      total_payout: 0,
      registration_level_id: level.id,
      registration_level_name: level.level_name,
    });

    await svc.entities.CashbackTransaction.create({
      client_id: client.id,
      client_name: client.name,
      transaction_type: 'welcome_cashback',
      amount: welcome,
      cashback_amount: welcome,
      payout_amount: 0,
      description: `Welcome bonus of ${welcome} EGP for registration`,
    });

    if (referrer) await promoteChain(base44, svc, referrer, tiers);

    return Response.json({ client_id: client.id, referral_code: referralCode, referrer_id: referrer?.id || null });
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
