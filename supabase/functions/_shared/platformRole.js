/**
 * THE central rule for the platform role (admin/user) on the backend.
 * Frontend mirror: src/components/permissions/platformRoleRule.js — keep both in step.
 * (Backend functions cannot import from src/.)
 */
const norm = (email) => String(email || '').toLowerCase().trim();

// The safety-valve account lives ONLY in the SAFETY_VALVE_EMAIL app secret.
// The screen reads it through the synced perm_is_safety_valve account flag.
const valveEmail = () =>
  norm(
    typeof Deno !== 'undefined' && Deno?.env?.get
      ? Deno.env.get('SAFETY_VALVE_EMAIL')
      : typeof process !== 'undefined' && process?.env
      ? process.env.SAFETY_VALVE_EMAIL
      : ''
  );

export const isSafetyValveConfigured = () => !!valveEmail();

export const isSafetyValveEmail = (email) => {
  const v = valveEmail();
  return !!v && norm(email) === v;
};

/** Admin under the central rule, for bypass checks. The account's platform role is kept in step with platformRoleFor. */
export const isCentralAdmin = (user, permissions) =>
  isSafetyValveEmail(user?.email) || user?.role === 'admin';

export function platformRoleFor({ email, roleKey, roleRecord, isExEmployee = false }) {
  if (isSafetyValveEmail(email)) return 'admin';
  if (!roleKey || isExEmployee) return 'user';
  if (roleRecord && roleRecord.is_active !== false && roleRecord.permissions?.users_manage === true) return 'admin';
  return 'user';
}

/**
 * The platform role an account should hold, or null when the rule leaves it alone:
 * without the SAFETY_VALVE_EMAIL secret (fail closed — the valve could be demoted)
 * and for accounts with no staff access record (the app's builders keep theirs).
 */
export function targetPlatformRole(user, row, roleRecord) {
  if (!isSafetyValveConfigured()) return null;
  if (isSafetyValveEmail(user?.email)) return 'admin';
  if (!row) return null;
  return platformRoleFor({ email: user?.email, roleKey: row.role, roleRecord, isExEmployee: row.is_ex_employee === true });
}

/** Target platform role for every account, computed from UserPermissions + Role. */
export async function planPlatformRoles(svc) {
  const [users, rows, roles] = await Promise.all([
    svc.entities.User.list('-created_date', 1000),
    svc.entities.UserPermissions.list('-created_date', 2000),
    svc.entities.Role.list('sort_order', 500),
  ]);
  const rowBy = new Map(rows.map((r) => [norm(r.user_email), r]));
  return users.map((u) => {
    const row = rowBy.get(norm(u.email)) || null;
    const roleRecord = row?.role ? roles.find((r) => r.role_key === row.role) || null : null;
    const target = targetPlatformRole(u, row, roleRecord) || u.role;
    return { id: u.id, email: u.email, current: u.role, target, assigned_role: row?.role || null, change: u.role !== target };
  });
}