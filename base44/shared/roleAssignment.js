/**
 * HR-owned role assignment. The ONLY place a staff role is set or removed.
 * Rules:
 *  - hr_edit (or central admin) required; hr_edit is limited to its own branch.
 *  - Target must have an HR Employee record (clients never get roles directly).
 *  - Nobody changes their own role; the safety-valve account is untouchable.
 *  - Privileged roles (any role with users_manage) —
 *    assigning them or touching someone who holds one — central admins only.
 *  - Platform role follows the central rule; the permission copy is re-synced.
 *  - Removing access or deleting the employee deletes their sign-in account first;
 *    if it can't be deleted, nothing changes.
 */
import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { getCompanyOffset, companyDay } from './companyTimezone.js';
import { isCentralAdmin, isSafetyValveEmail, platformRoleFor } from './platformRole.js';
import { syncUsers } from './permissionCopySync.js';
import { loadPrivate } from './employeePrivate.js';

const norm = (e) => String(e || '').toLowerCase().trim();

export const isPrivilegedRole = (roleKey, roleRecord) =>
  roleRecord?.permissions?.users_manage === true;

export async function loadCaller(base44, user) {
  const perms = await getEffectivePermissions(base44, user);
  const central = isCentralAdmin(user, perms) === true;
  return {
    perms,
    central,
    canView: central || perms?.hr_view_all === true || perms?.hr_edit === true,
    canEdit: central || perms?.hr_edit === true,
  };
}

/** Branch limit (Phase 4): branch-scoped HR staff only reach their own branch. */
export const inCallerBranch = (caller, employee) =>
  caller.central || !caller.perms?.branch_id || employee?.branch_id === caller.perms.branch_id;

const fail = (status, error) => ({ status, error });

async function loadTarget(svc, employeeId) {
  const employee = employeeId ? await svc.Employee.get(employeeId).catch(() => null) : null;
  if (!employee?.email) return { employee };
  const rows = await svc.UserPermissions.filter({ user_email: employee.email });
  const row = rows.find((r) => norm(r.user_email) === norm(employee.email)) || rows[0] || null;
  const roleRecord = row?.role ? (await svc.Role.filter({ role_key: row.role }))[0] || null : null;
  return { employee, row, roleRecord };
}

async function guard(svc, caller, user, target) {
  if (!caller.canEdit) return fail(403, 'Forbidden: requires hr_edit');
  if (!target.employee) return fail(404, 'HR employee record not found');
  if (!target.employee.email) return fail(400, 'The employee record has no email');
  if (!inCallerBranch(caller, target.employee)) return fail(403, 'Forbidden: employee is outside your branch');
  if (norm(target.employee.email) === norm(user.email)) return fail(403, 'You cannot change or remove your own role');
  if (isSafetyValveEmail(target.employee.email)) return fail(403, "The safety-valve account's role cannot be changed or removed");
  if (!caller.central && target.row?.role && target.row.is_ex_employee !== true && isPrivilegedRole(target.row.role, target.roleRecord)) {
    return fail(403, 'Only central admins can change or remove an admin-level role');
  }
  return null;
}

async function applyPlatformRoleAndSync(svc, email, roleKey, roleRecord, isExEmployee) {
  const users = await svc.User.filter({ email });
  const account = users.find((u) => norm(u.email) === norm(email)) || users[0];
  if (!account) return { registered: false };
  const target = platformRoleFor({ email, roleKey, roleRecord, isExEmployee });
  if (account.role !== target) await svc.User.update(account.id, { role: target });
  const [result] = await syncUsers({ entities: svc }, [{ ...account, role: target }], 'role_change');
  return { registered: true, platform_role: target, sync_ok: result?.ok === true };
}

async function findAccount(svc, email) {
  const key = norm(email);
  if (!key) return null;
  for (const value of new Set([String(email).trim(), key])) {
    const match = (await svc.User.filter({ email: value })).find((u) => norm(u.email) === key);
    if (match) return match;
  }
  return null;
}

// The sign-in account goes with the job (the platform keeps it restorable for 30 days).
// Done first, so a failure (e.g. the app owner's account) leaves everything unchanged.
async function deleteAccount(svc, email) {
  const account = await findAccount(svc, email);
  if (!account) return { account_deleted: false };
  const error = await svc.User.delete(account.id).then(() => null, (e) => e?.message || 'unknown error');
  if (error) return fail(409, `Their sign-in account couldn't be deleted (${error}), so nothing was changed`);
  return { account_deleted: true };
}

// Ex-employee: the role is kept as previous_role, and signing up again grants nothing.
const revokeRole = (svc, row) => svc.UserPermissions.update(row.id, {
  is_ex_employee: true,
  previous_role: row.role,
  role: 'view_only',
  permission_overrides: {},
  module_overrides: {},
  tab_overrides: {},
});

export async function assignRole(svc, caller, user, { employee_id, role_key }) {
  if (!role_key) return fail(400, 'role_key is required');
  const target = await loadTarget(svc, employee_id);
  const denied = await guard(svc, caller, user, target);
  if (denied) return denied;

  const roleRecord = (await svc.Role.filter({ role_key, is_active: true }))[0];
  if (!roleRecord) return fail(400, 'Unknown or inactive role');
  if (!caller.central && isPrivilegedRole(role_key, roleRecord)) {
    return fail(403, 'Only central admins can assign an admin-level role');
  }

  const { employee, row } = target;
  const data = {
    user_email: employee.email,
    user_name: employee.name || row?.user_name || employee.email,
    role: role_key,
    is_ex_employee: false,
    login_disabled: false,
    previous_role: null,
    permission_overrides: {},
    module_overrides: {},
    tab_overrides: {},
  };
  if (row) await svc.UserPermissions.update(row.id, data);
  else await svc.UserPermissions.create(data);
  if (['terminated', 'inactive'].includes(employee.status)) await svc.Employee.update(employee.id, { status: 'active' });

  const platform = await applyPlatformRoleAndSync(svc, employee.email, role_key, roleRecord, false);
  return { ok: true, role: role_key, ...platform };
}

export async function removeAccess(svc, caller, user, { employee_id }) {
  const target = await loadTarget(svc, employee_id);
  const denied = await guard(svc, caller, user, target);
  if (denied) return denied;
  const { employee, row } = target;
  if (!row || row.is_ex_employee === true) return fail(400, 'This person has no active role to remove');

  const account = await deleteAccount(svc, employee.email);
  if (account.error) return account;
  await revokeRole(svc, row);
  // The leaving day (company calendar; UTC until a timezone is set) feeds leavers and turnover.
  const offset = await getCompanyOffset(svc);
  await svc.Employee.update(employee.id, { status: 'terminated', left_date: offset === null ? new Date().toISOString().slice(0, 10) : companyDay(offset) });
  return { ok: true, previous_role: row.role, ...account };
}

/** Delete: sign-in account deleted, access revoked, record archived to Ex-Employees, HR record removed. */
export async function deleteEmployee(svc, caller, user, { employee_id }) {
  const target = await loadTarget(svc, employee_id);
  const { employee, row } = target;
  if (!caller.canEdit) return fail(403, 'Forbidden: requires hr_edit');
  if (!employee) return fail(404, 'HR employee record not found');
  if (!inCallerBranch(caller, employee)) return fail(403, 'Forbidden: employee is outside your branch');
  if (employee.employment_type === 'system_account' && !caller.central) return fail(403, 'Only central admins can delete a system account');
  if (employee.email) {
    if (norm(employee.email) === norm(user.email)) return fail(403, 'You cannot delete your own employee record');
    const denied = await guard(svc, caller, user, target);
    if (denied) return denied;
  }

  const account = await deleteAccount(svc, employee.email);
  if (account.error) return account;
  if (row && row.is_ex_employee !== true) await revokeRole(svc, row);
  const priv = await loadPrivate(svc, employee.id);
  const snapshot = {
    original_employee_id: employee.id, employee_id: employee.employee_id, name: employee.name,
    email: employee.email, phone: employee.phone, position: employee.position, department: employee.department,
    branch_id: employee.branch_id, branch_name: employee.branch_name, employment_type: employee.employment_type,
    hire_date: employee.hire_date, salary_type: employee.salary_type,
    hourly_rate: priv?.hourly_rate, fixed_salary: priv?.fixed_salary,
    last_status: employee.status, left_date: employee.left_date || null,
    deleted_at: new Date().toISOString(), deleted_by: user.email,
  };
  await svc.ExEmployee.create(Object.fromEntries(Object.entries(snapshot).filter(([, v]) => v !== null && v !== undefined)));
  await svc.Employee.delete(employee.id);
  return { ok: true, name: employee.name, ...account };
}

/** Move an employee to another branch (HR record + access record), then re-sync scoping. */
export async function reassignBranch(svc, caller, user, { employee_id, branch_id }) {
  if (!branch_id) return fail(400, 'branch_id is required');
  const target = await loadTarget(svc, employee_id);
  if (target.employee?.email) {
    const denied = await guard(svc, caller, user, target);
    if (denied) return denied;
  } else {
    if (!caller.canEdit) return fail(403, 'Forbidden: requires hr_edit');
    if (!target.employee) return fail(404, 'HR employee record not found');
    if (!inCallerBranch(caller, target.employee)) return fail(403, 'Forbidden: employee is outside your branch');
  }
  if (!caller.central && caller.perms?.branch_id && branch_id !== caller.perms.branch_id) {
    return fail(403, 'Forbidden: you can only assign staff to your own branch');
  }
  const branch = await svc.Branch.get(branch_id).catch(() => null);
  if (!branch) return fail(400, 'Unknown branch');

  const { employee, row } = target;
  const data = { branch_id: branch.id, branch_name: branch.name };
  await svc.Employee.update(employee.id, data);
  if (row) await svc.UserPermissions.update(row.id, data);

  let sync_ok = null;
  if (employee.email) {
    const users = await svc.User.filter({ email: employee.email });
    const account = users.find((u) => norm(u.email) === norm(employee.email)) || users[0];
    if (account) {
      const [result] = await syncUsers({ entities: svc }, [account], 'role_change');
      sync_ok = result?.ok === true;
    }
  }
  return { ok: true, previous_branch: employee.branch_name || null, branch_name: branch.name, sync_ok };
}

/** Role + registration status per visible employee (HR staff can't read those records directly). */
export async function listAccess(svc, caller, employeeIds = []) {
  if (!caller.canView) return fail(403, 'Forbidden: requires hr_view');
  const employees = (await Promise.all(employeeIds.slice(0, 1000).map((id) => svc.Employee.get(id).catch(() => null))))
    .filter((e) => e?.email && inCallerBranch(caller, e));
  const [rows, users] = await Promise.all([
    svc.UserPermissions.list('-created_date', 2000),
    svc.User.list('-created_date', 2000),
  ]);
  const rowBy = new Map(rows.map((r) => [norm(r.user_email), r]));
  const userSet = new Set(users.map((u) => norm(u.email)));
  const access = {};
  employees.forEach((e) => {
    const r = rowBy.get(norm(e.email));
    access[e.id] = {
      role: r && r.is_ex_employee !== true ? r.role : '',
      is_ex_employee: r?.is_ex_employee === true,
      previous_role: r?.previous_role || null,
      registered: userSet.has(norm(e.email)),
      is_safety_valve: isSafetyValveEmail(e.email),
    };
  });
  return { access, is_central_admin: caller.central };
}