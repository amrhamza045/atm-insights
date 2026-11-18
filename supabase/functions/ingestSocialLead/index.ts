import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
const secrets = Deno.env;
import { safeEqual, secretReader } from '../_shared/socialWebhookAuth.js';
import { loadConnection, saveFormLeads } from '../_shared/socialLeadStore.js';

const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'whatsapp'];

// Forwarding webhook for Zapier / Make (TikTok and LinkedIn lead forms, or any platform):
// POST JSON to /functions/ingestSocialLead?platform=<platform>&secret=<SOCIAL_LEADS_WEBHOOK_SECRET>.
// One lead per body, or { leads: [...] }. A repeat delivery of the same lead_id is ignored.
async function handler(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);

    // Webhook: unauthenticated caller — verify the shared secret before doing anything.
    const provided = body.secret || url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
    if (!safeEqual(provided, secretReader(secrets)('SOCIAL_LEADS_WEBHOOK_SECRET'))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const platform = String(url.searchParams.get('platform') || body.platform || '').toLowerCase();
    if (!PLATFORMS.includes(platform)) {
      return Response.json({ error: `platform must be one of ${PLATFORMS.join(', ')}` }, { status: 400 });
    }

    const svc = createClientFromRequest(req).asServiceRole;
    const connection = await loadConnection(svc, platform);
    if (!connection?.is_enabled) {
      return Response.json({ ok: true, created: 0, skipped: `${platform} lead capture is switched off in Social Media` });
    }
    const incoming = (Array.isArray(body.leads) ? body.leads : [body]).map(({ secret, ...lead }) => {
      const ref = lead.external_id || lead.lead_id || lead.leadId || lead.id;
      return { ...lead, external_id: ref ? `${platform}_lead:${ref}` : '' };
    });
    const created = await saveFormLeads(svc, platform, connection, incoming);
    return Response.json({ ok: true, created });
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
