import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { wasteContext, postWasteDeclaration } from '../_shared/inventoryWastePosting.js';

// Posts the finance journal for one approved waste declaration (idempotent).
// Callable by admins and people who may approve waste.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
    if (user.role !== 'admin') {
      const perms = await getEffectivePermissions(base44, user);
      if (perms?.waste_approve !== true) return Response.json({ error: 'Permission required: waste_approve' }, { status: 403 });
    }
    const { waste_id } = await req.json().catch(() => ({}));
    if (!waste_id || typeof waste_id !== 'string') return Response.json({ error: 'waste_id is required.' }, { status: 400 });
    return Response.json(await postWasteDeclaration(wasteContext(base44, user), waste_id));
  } catch (error) {
    console.error('Waste posting failed:', error.message);
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
