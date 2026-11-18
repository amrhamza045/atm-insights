import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';

/**
 * Self-service portal linking. Called by the logged-in customer themselves:
 * if their email has a pending (invited) CateringPortalAccess row, their account
 * is stamped with the client so the portal opens — no staff "sync" step needed.
 *
 * Service role is required because linking writes to the user account, which a
 * regular app user cannot do. It only ever links the caller's OWN email.
 */
async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.portal_client_id) return Response.json({ ok: true, linked: true, alreadyLinked: true });

    const email = String(user.email || '').toLowerCase().trim();
    if (!email) return Response.json({ ok: true, linked: false });

    const svc = base44.asServiceRole;
    const rows = await svc.entities.CateringPortalAccess.filter({ email });
    const row = rows.find((r) => r.status === 'invited') || rows.find((r) => r.status === 'linked');
    if (!row) return Response.json({ ok: true, linked: false });

    await svc.entities.User.update(user.id, {
      portal_client_id: row.client_id,
      portal_client_name: row.client_name || '',
    });

    if (row.status !== 'linked') {
      await svc.entities.CateringPortalAccess.update(row.id, {
        status: 'linked',
        linked_user_id: user.id,
        linked_date: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, linked: true, clientName: row.client_name || '' });
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
