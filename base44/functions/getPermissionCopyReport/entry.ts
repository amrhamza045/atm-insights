import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { loadSyncContext, computeCopy, diffCopy } from '../../shared/permissionCopySync.js';
import { readCopy } from '../../shared/permissionCopyStore.js';

// Admin-only: stored copy vs what the resolver returns right now, per account.
export default async function(req) {
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