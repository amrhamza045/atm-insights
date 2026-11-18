/**
 * Notification recipients by permission, resolved with the same resolver as
 * every server gate (live role + per-user overrides), so Super Admins are included.
 */
import { resolveEffectivePermissions } from './resolveEffectivePermissions.js';

const norm = (email) => String(email || '').toLowerCase().trim();

/** Users (with an email) who hold `flag`. Pass the service-role client. */
export async function usersWithPermission(svc, flag) {
  const [users, rows, roles] = await Promise.all([
    svc.entities.User.list('-created_date', 1000),
    svc.entities.UserPermissions.list('-created_date', 2000),
    svc.entities.Role.filter({ is_active: true }),
  ]);
  const rowBy = new Map(rows.map((r) => [norm(r.user_email), r]));
  return users.filter((u) => {
    if (!u.email) return false;
    const row = rowBy.get(norm(u.email)) || null;
    const roleRecord = row?.role ? roles.find((r) => r.role_key === row.role) || null : null;
    const perms = resolveEffectivePermissions({ row, roleRecord, isPlatformAdmin: u.role === 'admin' });
    return !perms.access_denied && perms[flag] === true;
  });
}