import { ALL_PERMISSION_KEYS, allDenied, allGranted } from "./permissionKeys";
import { platformRoleFor } from "./platformRoleRule";

/**
 * THE single permission resolution point for the frontend.
 * (base44/shared/resolveEffectivePermissions.js is its backend mirror — keep both in step.)
 *
 * Resolution order, in this exact sequence:
 *   1. is_ex_employee -> deny everything, full stop.
 *   2. Platform admin -> full access (preserved safety valve, so a
 *      broken role record can never lock the owner out of their own app).
 *   3. No active Role record for the row's role key -> deny everything
 *      (fail-safe lockout) until an admin assigns a valid role.
 *   4. Otherwise -> role's LIVE permissions, overridden key-by-key by the row's
 *      sparse permission_overrides. Same merge shape for module access
 *      (module_overrides) and for closed tabs and sub-tabs (tab_overrides).
 *
 * Returns a flat object shaped like the old row, so every existing consumer can
 * keep reading `permissions.pos_view`, `permissions.role`, `permissions.branch_id`.
 */
export function mergeDisabledModules(roleDisabled = [], moduleOverrides = {}) {
  const denied = new Set(Array.isArray(roleDisabled) ? roleDisabled : []);
  Object.entries(moduleOverrides || {}).forEach(([key, allowed]) => {
    if (allowed === true) denied.delete(key);
    else if (allowed === false) denied.add(key);
  });
  return Array.from(denied);
}

const identity = (row) => ({
  user_email: row?.user_email || null,
  user_name: row?.user_name || null,
  branch_id: row?.branch_id || null,
  branch_name: row?.branch_name || null,
  is_ex_employee: row?.is_ex_employee === true,
  login_disabled: row?.login_disabled === true,
  previous_role: row?.previous_role || null
});

// Every resolved set also carries platform_role, computed by the central rule.
export function resolveEffectivePermissions({ row, roleRecord, currentUser }) {
  return {
    ...resolveBase({ row, roleRecord, currentUser }),
    platform_role: platformRoleFor({
      isSafetyValve: currentUser?.perm_is_safety_valve === true,
      roleKey: row?.role,
      roleRecord,
      isExEmployee: row?.is_ex_employee === true || row?.login_disabled === true
    })
  };
}

function resolveBase({ row, roleRecord, currentUser }) {
  const isPlatformAdmin = currentUser?.role === "admin";

  // 1. Disabled accounts and revoked staff are denied before role or overrides are even considered.
  if (row?.login_disabled === true && currentUser?.perm_is_safety_valve !== true) {
    return {
      ...identity(row),
      role: "view_only",
      ...allDenied(),
      disabled_modules: [],
      disabled_tabs: [],
      access_denied: true,
      denial_reason: "login_disabled"
    };
  }

  if (row?.is_ex_employee === true && !isPlatformAdmin) {
    return {
      ...identity(row),
      role: row.role || "view_only",
      ...allDenied(),
      disabled_modules: [],
      disabled_tabs: [],
      access_denied: true,
      denial_reason: "ex_employee"
    };
  }

  // 2. Platform admins keep full access (a role becomes admin through "Manage users").
  if (isPlatformAdmin) {
    return {
      ...identity(row),
      role: isPlatformAdmin && !row?.role ? "super_admin" : row?.role || "super_admin",
      ...allGranted(),
      // Explicit per-user module denials still apply to permission-based super
      // admins, exactly as before; platform admins are never module-restricted.
      disabled_modules: isPlatformAdmin
        ? []
        : mergeDisabledModules(roleRecord?.disabled_modules, row?.module_overrides),
      // Tabs and sub-tabs closed for the role, with the user's own changes on top.
      disabled_tabs: isPlatformAdmin
        ? []
        : mergeDisabledModules(roleRecord?.disabled_tabs, row?.tab_overrides),
      access_denied: false,
      denial_reason: null
    };
  }

  // No staff row at all — a plain registered client. Preserves the previous
  // view_only fallback so client-facing pages behave exactly as they do today.
  if (!row) {
    return {
      user_email: currentUser?.email || null,
      user_name: currentUser?.full_name || null,
      branch_id: null,
      branch_name: null,
      is_ex_employee: false,
      previous_role: null,
      role: "view_only",
      ...allDenied(),
      menu_view: true,
      disabled_modules: [],
      disabled_tabs: [],
      access_denied: false,
      denial_reason: null
    };
  }

  // 3. Fail-safe: a role key with no active Role record grants nothing.
  if (!roleRecord) {
    return {
      ...identity(row),
      role: row.role || null,
      ...allDenied(),
      disabled_modules: [],
      disabled_tabs: [],
      access_denied: true,
      denial_reason: "unknown_role"
    };
  }

  // 4. Live role permissions, then the user's sparse overrides on top.
  return {
    ...identity(row),
    role: row.role,
    ...assignedFlags(row, roleRecord),
    disabled_modules: mergeDisabledModules(roleRecord.disabled_modules, row.module_overrides),
    disabled_tabs: mergeDisabledModules(roleRecord.disabled_tabs, row.tab_overrides),
    access_denied: false,
    denial_reason: null
  };
}

// Legacy keys grant what they stood for, so a role holding only one still works.
const LEGACY_EQUIVALENTS = { inventory_manage: ["inventory_view", "inventory_edit"], pos_access: ["pos_view"] };

/** The Role record's live flags with the row's sparse per-user overrides on top. */
function assignedFlags(row, roleRecord) {
  const rolePermissions = roleRecord?.permissions || {};
  const overrides = row?.permission_overrides || {};
  const flags = Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, (key in overrides ? overrides[key] : rolePermissions[key]) === true]));
  Object.entries(LEGACY_EQUIVALENTS).forEach(([legacy, keys]) => {
    if (flags[legacy]) keys.forEach((k) => { flags[k] = true; });
  });
  return flags;
}

/**
 * Assigned flags only — what the Roles tab and per-user overrides grant, nothing else:
 * no platform-admin or super_admin shortcut. Revoked staff, no staff row or no active
 * Role record → everything denied. The requisition screens gate on this so they match
 * the server, which resolves requisition access the same way.
 */
export function resolveAssignedPermissions({ row, roleRecord }) {
  const scope = { role: row?.role || null, branch_id: row?.branch_id || null };
  if (!row || row.is_ex_employee === true || row.login_disabled === true || !roleRecord) return { ...scope, ...allDenied(), access_denied: true };
  return { ...scope, ...assignedFlags(row, roleRecord), access_denied: false };
}

export default resolveEffectivePermissions;