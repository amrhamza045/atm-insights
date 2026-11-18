import { base44 } from "@/api/base44Client";

import { platformRoleFor } from "@/components/permissions/platformRoleRule";

/** Platform role the central rule gives this email + assigned role key (null = no role). */
export async function platformRoleForAssignment(email, roleKey, { isExEmployee = false, isSafetyValve } = {}) {
  const roleRecord = roleKey
    ? (await base44.entities.Role.filter({ role_key: roleKey, is_active: true }))[0] || null
    : null;
  // Valve status comes from the account's synced flag (set from the app secret).
  const valve = isSafetyValve ?? (await base44.entities.User.filter({ email }))[0]?.perm_is_safety_valve === true;
  return platformRoleFor({ isSafetyValve: valve, roleKey, roleRecord, isExEmployee });
}

/**
 * Align an already-registered User's platform role with the central rule.
 * Used only by the invite flow (Send Invite) for accounts that already exist.
 */
export async function syncPlatformUserRole(email, roleKey, options) {
  const platformRole = await platformRoleForAssignment(email, roleKey, options);
  const users = await base44.entities.User.filter({ email });
  if (users[0] && users[0].role !== platformRole) {
    await base44.entities.User.update(users[0].id, { role: platformRole });
  }
  if (users[0]) {
    await base44.functions.invoke("syncPermissionCopy", { trigger: "role_change", user_id: users[0].id });
  }
  return platformRole;
}

/**
 * Email a sign-up link with the platform role the central rule gives roleKey.
 * inviteUser throws when the address already has an account, so fall back to
 * correcting its role.
 */
export async function inviteOrSyncUser(email, roleKey) {
  const platformRole = await platformRoleForAssignment(email, roleKey);
  try {
    await base44.users.inviteUser(email, platformRole);
    return { invited: true };
  } catch {
    await syncPlatformUserRole(email, roleKey);
    return { invited: false };
  }
}

const invalidate = (queryClient) => {
  if (!queryClient) return;
  ["employeeAccess", "allUserPermissions", "userPermissions", "users", "employees"].forEach((k) =>
    queryClient.invalidateQueries({ queryKey: [k] })
  );
};

const errorOf = (e) => e?.response?.data?.error || e?.message || "Request failed";

/**
 * Assign a role to an HR employee. The server enforces every rule
 * (hr_edit, branch, admin-level roles, self, safety valve) and runs the sync.
 */
export async function assignEmployeeRole({ employeeId, roleKey, queryClient }) {
  if (!employeeId || !roleKey) return null;
  try {
    const res = await base44.functions.invoke("manageEmployeeRole", { action: "assign", employee_id: employeeId, role_key: roleKey });
    return res.data;
  } catch (e) {
    throw new Error(errorOf(e));
  } finally {
    invalidate(queryClient);
  }
}

/** Move an employee to another branch; the server updates HR + access records and re-syncs. */
export async function reassignEmployeeBranch({ employeeId, branchId, queryClient }) {
  try {
    const res = await base44.functions.invoke("manageEmployeeRole", { action: "reassign_branch", employee_id: employeeId, branch_id: branchId });
    return res.data;
  } catch (e) {
    throw new Error(errorOf(e));
  } finally {
    invalidate(queryClient);
  }
}

/** Delete an employee: sign-in account deleted, access revoked, record moved to Ex-Employees. */
export async function deleteEmployeeRecord({ employeeId, queryClient }) {
  try {
    const res = await base44.functions.invoke("manageEmployeeRole", { action: "delete", employee_id: employeeId });
    return res.data;
  } catch (e) {
    throw new Error(errorOf(e));
  } finally {
    invalidate(queryClient);
  }
}

/** Remove a person's access: sign-in account deleted, ex-employee (previous role saved), HR record terminated. */
export async function removeEmployeeAccess({ employeeId, queryClient }) {
  try {
    const res = await base44.functions.invoke("manageEmployeeRole", { action: "remove", employee_id: employeeId });
    return res.data;
  } catch (e) {
    throw new Error(errorOf(e));
  } finally {
    invalidate(queryClient);
  }
}