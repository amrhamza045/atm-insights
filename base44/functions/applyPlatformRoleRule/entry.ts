import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { planPlatformRoles, isSafetyValveEmail, isSafetyValveConfigured } from '../../shared/platformRole.js';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { syncUsers } from '../../shared/permissionCopySync.js';

// One-time / on-demand correction: applies the central platform-role rule to
// every account. dry_run (default true) only reports. Requires users_manage.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, 'users_manage');
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    // Fail closed: without the secret the valve account could be demoted.
    if (!dryRun && !isSafetyValveConfigured()) {
      return Response.json({ error: 'SAFETY_VALVE_EMAIL secret is not set — refusing to change platform roles.' }, { status: 409 });
    }
    const svc = base44.asServiceRole;
    const plan = await planPlatformRoles(svc);
    const changes = plan.filter((p) => p.change && !(isSafetyValveEmail(p.email) && p.target !== 'admin'));

    if (!dryRun) {
      for (const c of changes) await svc.entities.User.update(c.id, { role: c.target });
      // Bulk edit: automations don't fire, so re-sync the permission copies directly.
      if (changes.length) {
        const changed = await Promise.all(changes.map((c) => svc.entities.User.get(c.id)));
        await syncUsers(svc, changed, 'bulk');
      }
    }
    return Response.json({ dry_run: dryRun, change_count: changes.length, changes, plan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}