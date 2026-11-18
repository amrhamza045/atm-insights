import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { secrets } from 'base44:runtime';
import { safeEqual, secretReader, validMetaSignature } from '../_shared/socialWebhookAuth.js';
import { loadConnection, saveFormLeads, saveMessageLead } from '../_shared/socialLeadStore.js';
import { readMetaLead, readMetaSender } from '../_shared/metaGraph.js';

// Facebook + Instagram webhook for one Meta app (Page and Instagram objects).
// GET: Meta's subscription check with the verify token. POST: lead form ads and messages,
// signed with the App Secret. Leads land in CRM › Leads › Social leads.
async function handler(req) {
  try {
    const secret = secretReader(secrets);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe'
        && safeEqual(url.searchParams.get('hub.verify_token'), secret('META_VERIFY_TOKEN'));
      if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return new Response(url.searchParams.get('hub.challenge') || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const raw = await req.text();
    if (!(await validMetaSignature(raw, req.headers.get('x-hub-signature-256'), secret('META_APP_SECRET')))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const svc = createClientFromRequest(req).asServiceRole;
    const token = secret('META_PAGE_ACCESS_TOKEN');
    const [facebook, instagram] = await Promise.all([loadConnection(svc, 'facebook'), loadConnection(svc, 'instagram')]);
    const connections = { facebook, instagram };
    const formsOn = facebook?.is_enabled || instagram?.is_enabled;
    const chatPlatform = body.object === 'instagram' ? 'instagram' : 'facebook';
    const chatOn = connections[chatPlatform]?.is_enabled;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen' || !change.value?.leadgen_id || !formsOn) continue;
        const { platform, item, problem } = await readMetaLead(change.value, token);
        await saveFormLeads(svc, platform, connections[platform], [item]);
        if (problem && facebook?.is_enabled) {
          await svc.entities.SocialMediaConnection.update(facebook.id, {
            connection_status: 'error',
            last_check_message: `A lead arrived but its details could not be read: ${problem}`,
          });
        }
      }

      for (const event of entry.messaging || []) {
        const message = event.message;
        // Skip receipts, postbacks and the business's own replies.
        if (!chatOn || !message || message.is_echo || event.sender?.id === entry.id) continue;
        const text = message.text || (message.attachments?.length ? '[Attachment received]' : '');
        if (!text) continue;
        const sender = await readMetaSender(event.sender.id, chatPlatform, token);
        await saveMessageLead(svc, chatPlatform, connections[chatPlatform], {
          senderKey: event.sender.id,
          text,
          ...sender,
          notes: chatPlatform === 'instagram' ? 'Instagram direct message' : 'Facebook Messenger',
        });
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('metaLeadsWebhook failed:', error);
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
