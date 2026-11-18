import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
const secrets = Deno.env;
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { secretReader } from '../_shared/socialWebhookAuth.js';
import { loadConnection } from '../_shared/socialLeadStore.js';
import { PLATFORM_SECRETS, runConnectionCheck } from '../_shared/socialConnectionChecks.js';

// Admin › Systems › Social Media.
//  { action: 'secrets' }          → which required secrets are saved (true / false, never the values)
//  { action: 'check', platform }  → live connection check; the result is stored on the platform's card
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const denied = await denyUnlessPermitted(base44, user, 'social_media_view');
    if (denied) return denied;

    const { action, platform } = await req.json().catch(() => ({}));
    const secret = secretReader(secrets);

    if (action === 'secrets') {
      const names = [...new Set(Object.values(PLATFORM_SECRETS).flat())];
      return Response.json({ secrets: Object.fromEntries(names.map((name) => [name, !!secret(name)])) });
    }
    if (action !== 'check' || !PLATFORM_SECRETS[platform]) {
      return Response.json({ error: 'action must be "secrets", or "check" with a known platform' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const record = await loadConnection(svc, platform);
    const result = await runConnectionCheck(platform, record, secret);
    const patch = { connection_status: result.status, last_check_message: result.message };
    if (result.status === 'connected') patch.last_verified_date = new Date().toISOString();
    // Fill the account name / ID from the platform only where the card left them blank.
    for (const [field, value] of Object.entries(result.account || {})) {
      if (!record?.[field]) patch[field] = value;
    }
    if (record) await svc.entities.SocialMediaConnection.update(record.id, patch);
    else await svc.entities.SocialMediaConnection.create({ platform, ...patch });

    return Response.json({ status: result.status, message: result.message });
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
