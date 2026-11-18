import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { secrets } from 'base44:runtime';
import { secretReader, validTwilioSignature } from '../_shared/socialWebhookAuth.js';
import { loadConnection, saveMessageLead } from '../_shared/socialLeadStore.js';

// The address shown in Admin › Systems › Social Media; Twilio signs with the exact URL it calls.
const PUBLISHED_APP_URL = 'https://rosemary.base44.app';
const EMPTY_REPLY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

// Twilio "a message comes in" webhook of the WhatsApp sender: each incoming WhatsApp message
// becomes a lead, or is added to the sender's lead from the last hour.
async function handler(req) {
  try {
    const params = Object.fromEntries(new URLSearchParams(await req.text()));
    const path = `/functions/captureWhatsAppLead${new URL(req.url).search}`;
    const appUrl = (req.headers.get('x-base44-app-url') || '').replace(/\/$/, '');
    const urls = [req.url, PUBLISHED_APP_URL + path, appUrl && appUrl + path].filter(Boolean);
    const authToken = secretReader(secrets)('TWILIO_AUTH_TOKEN');
    if (!(await validTwilioSignature(urls, params, req.headers.get('x-twilio-signature'), authToken))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const phone = String(params.From || '').replace(/^whatsapp:/, '');
    const text = params.Body || (Number(params.NumMedia) > 0 ? '[Media received]' : '');
    if (phone && text) {
      const svc = createClientFromRequest(req).asServiceRole;
      await saveMessageLead(svc, 'whatsapp', await loadConnection(svc, 'whatsapp'), {
        senderKey: phone,
        text,
        sender_name: params.ProfileName || '',
        phone,
        notes: 'WhatsApp conversation',
      });
    }
    return new Response(EMPTY_REPLY, { status: 200, headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('captureWhatsAppLead failed:', error);
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
