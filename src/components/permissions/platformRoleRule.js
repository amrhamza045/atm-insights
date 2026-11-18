/**
 * THE central rule for the platform role (admin/user) on the frontend.
 * Backend mirror: base44/shared/platformRole.js — keep both in step.
 *
 *  - Safety-valve account           -> "admin", always; never changed by any flow.
 *  - Super Admin role               -> "admin", even if its users_manage box is unticked.
 *  - Any other active role whose own
 *    permissions include users_manage -> "admin".
 *  - Every other role, a revoked
 *    (ex-employee) row, or no role  -> "user".
 */
// The safety-valve email is NOT in the code: it lives in the SAFETY_VALVE_EMAIL
// app secret, and the server sync stamps perm_is_safety_valve on that account.
export const isSafetyValveUser = (user) => user?.perm_is_safety_valve === true;

export function platformRoleFor({ isSafetyValve = false, roleKey, roleRecord, isExEmployee = false }) {
  if (isSafetyValve) return "admin";
  if (!roleKey || isExEmployee) return "user";
  if (roleRecord && roleRecord.is_active !== false && roleRecord.permissions?.users_manage === true) return "admin";
  return "user";
}

export default platformRoleFor;