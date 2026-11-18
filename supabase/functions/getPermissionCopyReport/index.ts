import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { loadSyncContext, computeCopy, diffCopy } from '../_shared/permissionCopySync.js';
import { readCopy } from '../_shared/permissionCopyStore.js';

// Admin-only: stored copy vs what the resolver returns right now, per account.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, 'users_manage');
    if (denied) return denied;

    const svc = base44.asServiceRole;
    const [users, ctx] = await Promise.all([svc.entities.User.list('-created_date', 1000), loadSyncContext(svc)]);
    const rows = [];
    for (const u of users) {
      const stored = await readCopy(svc, u);
      const expected = computeCopy(u, ctx);
      const diff = stored.synced_at ? diffCopy(stored, expected) : ['never_synced'];
      rows.push({
        id: u.id, email: u.email, name: u.full_name,
        role: stored.role, is_central_admin: stored.is_central_admin, branch_id: stored.branch_id,
        granted: Object.keys(stored.flags || {}).filter((k) => stored.flags[k]),
        matches: diff.length === 0, diff, synced_at: stored.synced_at,
      });
    }
    return Response.json({ rows });
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
