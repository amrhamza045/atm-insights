import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { executiveContext } from '../_shared/executiveAccess.js';
import { executiveMetrics } from '../_shared/executiveMetrics.js';

// Executive Dashboard catering and CRM figures (totals only) for the picked
// branches and the standard period.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = await req.json().catch(() => ({}));
    return Response.json(await executiveMetrics(ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive metrics failed:', error.message);
    return Response.json({ error: error.message }, { status });
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
