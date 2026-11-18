import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../_shared/platformRole.js';

// Header branch picker: which company (Admin › Companies) each branch belongs to.
// Read-only and limited to what the picker shows; never returns Finance settings.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const permissions = await getEffectivePermissions(base44, user);
    if (permissions.access_denied) return Response.json({ companies: [] });

    // Same branch lock the picker applies: central admins see every branch.
    const lock = isCentralAdmin(user, permissions) ? null : permissions.branch_id || null;
    const page = await base44.asServiceRole.entities.FinanceCompany.filter({}, { sort: 'created_date', limit: 100 });
    const companies = page.items
      .map((c) => ({
        id: c.id,
        name: c.name,
        company_code: c.company_code || '',
        is_active: c.is_active !== false,
        is_test: !!c.is_test,
        branch_ids: (c.branch_ids || []).filter((id) => !lock || id === lock),
      }))
      .filter((c) => c.branch_ids.length > 0);

    return Response.json({ companies });
  } catch (error) {
    console.error('Branch picker companies failed:', error.message);
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
