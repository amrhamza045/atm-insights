import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { runInventoryJob } from '../_shared/inventoryAccountingJob.js';

// Recognizes COGS for a closed catering event (idempotent: retries return the prior journal).
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
    if (user.role !== 'admin') {
      const perms = await getEffectivePermissions(base44, user);
      if (perms?.catering_edit !== true) return Response.json({ error: 'Permission required: catering_edit' }, { status: 403 });
    }
    const { event_id } = await req.json().catch(() => ({}));
    if (!event_id || typeof event_id !== 'string') return Response.json({ error: 'event_id is required.' }, { status: 400 });
    const ctx = { base44, svc: base44.asServiceRole, user, admin: true, permissions: {} };
    return Response.json(await runInventoryJob(ctx, { inventory_entity: 'CateringEvent', source_id: event_id }));
  } catch (error) {
    console.error('Event COGS posting failed:', error.message);
    return Response.json({ error: error.message }, { status: error.status || 500 });
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
