import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { isEmailEnabled, EMAIL_KEYS } from '../_shared/emailSettings.js';

// Returns only whether one email type is switched on — no other settings leak.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { event_key } = await req.json();
    if (!EMAIL_KEYS.includes(event_key)) {
      return Response.json({ error: 'Unknown email type' }, { status: 400 });
    }
    const enabled = await isEmailEnabled(base44.asServiceRole, event_key);
    return Response.json({ enabled });
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
