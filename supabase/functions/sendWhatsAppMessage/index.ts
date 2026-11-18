import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { sendWhatsApp } from '../_shared/twilioWhatsApp.js';

// Staff who send WhatsApp messages from the app (catering kitchen tickets and documents, POS).
const SENDERS = ['catering_view', 'catering_edit', 'catering_approve', 'catering_finance', 'cashier_edit', 'pos_view', 'clients_edit'];

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, SENDERS);
    if (denied) return denied;

    // media_url is optional: when present the message is sent as a WhatsApp
    // document/media message and `message` becomes its caption.
    const { phone_number, message, media_url } = await req.json().catch(() => ({}));
    if (!phone_number || (!message && !media_url)) {
      return Response.json({ error: 'Phone number and a message or media_url are required' }, { status: 400 });
    }

    const out = await sendWhatsApp({ phone_number, message, media_url });
    return Response.json(out.body, { status: out.status });
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
