import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

/**
 * Triggered when a CateringPackage is updated. If the package name or category
 * changed, every quote built from that package is restamped so quotes, documents
 * and the customer portal all show the package's current name.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await denyUnlessPermitted(base44, user, 'catering_edit');
    if (denied) return denied;
    const body = await req.json();
    const pkgId = body?.event?.entity_id;
    if (!pkgId) return Response.json({ error: 'Missing package id' }, { status: 400 });

    let pkg = body?.data;
    if (!pkg) pkg = await base44.asServiceRole.entities.CateringPackage.get(pkgId);
    const old = body?.old_data || {};

    const nameChanged = old.name !== undefined && old.name !== pkg.name;
    const categoryChanged = old.package_category !== undefined && old.package_category !== pkg.package_category;
    if (!nameChanged && !categoryChanged) {
      return Response.json({ updated: 0, reason: 'name and category unchanged' });
    }

    const quotes = await base44.asServiceRole.entities.CateringQuote.filter({ package_id: pkgId });
    if (!quotes.length) return Response.json({ updated: 0 });

    await base44.asServiceRole.entities.CateringQuote.bulkUpdate(
      quotes.map((q) => ({
        id: q.id,
        package_name: pkg.name || '',
        package_category: pkg.package_category || '',
      }))
    );

    return Response.json({ updated: quotes.length, package_name: pkg.name });
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
