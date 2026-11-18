/**
 * Backend mirror of src/components/permissions/resolveEffectivePermissions.js.
 * The two must stay in step — same resolution order, same merge semantics.
 * Duplicated rather than imported because backend functions cannot import from src/.
 */
// The app's one permission pool: exactly what Admin › Role Management lists.
export const ALL_PERMISSION_KEYS = [
  'menu_view', 'menu_create', 'menu_edit', 'menu_delete',
  'purchases_view', 'purchases_approve',
  'redemptions_view', 'redemptions_approve',
  'payouts_approve',
  'registrations_view', 'registrations_approve',
  'clients_view', 'clients_edit', 'clients_merge',
  'rewards_manage',
  'analytics_view', 'financial_view', 'finance_edit', 'users_manage', 'cashier_audit_view',
  'finance_company_manage', 'finance_accounts_manage', 'finance_journal_create', 'finance_journal_approve', 'finance_period_close', 'finance_reconstruct', 'finance_audit_view',
  'pos_view', 'pos_edit', 'pos_delete', 'pos_approve',
  'cashier_view', 'cashier_edit',
  'inventory_view', 'inventory_edit',
  'expiry_manage',
  'manufacturing_view', 'manufacturing_edit', 'butchery_view', 'butchery_edit',
  'purchase_view', 'purchase_edit', 'purchase_approve', 'supplier_payment_record',
  'admin_settings', 'admin_actions', 'admin_operations', 'admin_systems',
  'pos_access', 'inventory_manage', 'settings_edit',
  'sales_view',
  'delivery_view', 'kds_view', 'kds_bar_view',
  'hr_view_own', 'hr_view_all', 'hr_edit', 'hr_attendance_approve',
  'attendance_checkin', 'catering_view', 'catering_edit', 'catering_approve', 'catering_finance',
  'marketing_view_segments', 'social_media_view',
  'clear_cache_view', 'rule_history_view',
  'expense_approve', 'cashier_purchase_approve', 'recharge_approve',
  'level_upgrade_approve', 'return_approve', 'cashback_dist_approve', 'waste_approve',
  'delivery_bonus_approve', 'cashier_session_approve', 'deposit_withdrawal_approve', 'catering_payment_approve',
  'catering_quote_approve', 'catering_reservation_approve', 'catering_booking_approve',
  'requisition_view', 'requisition_submit', 'requisition_respond', 'requisition_release', 'requisition_approve', 'catering_settings_edit',
  'support_customization', 'review_moderate',
  'crm_full_view', 'selling_priority_manage', 'pos_call_center', 'pos_captain',
  'custody_view', 'custody_manage', 'custody_approve',
  'expenses_view', 'expenses_edit', 'expenses_config',
  'approval_self_bypass',
];

const allDenied = () => Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false]));
const allGranted = () => Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true]));

export function mergeDisabledModules(roleDisabled = [], moduleOverrides = {}) {
  const denied = new Set(Array.isArray(roleDisabled) ? roleDisabled : []);
  Object.entries(moduleOverrides || {}).forEach(([key, allowed]) => {
    if (allowed === true) denied.delete(key);
    else if (allowed === false) denied.add(key);
  });
  return Array.from(denied);
}

// Legacy keys grant what they stood for, so a role holding only one still works.
const LEGACY_EQUIVALENTS = { inventory_manage: ['inventory_view', 'inventory_edit'], pos_access: ['pos_view'] };

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

export function resolveEffectivePermissions({ row, roleRecord, isPlatformAdmin = false }) {
  const base = {
    user_email: row?.user_email || null,
    user_name: row?.user_name || null,
    branch_id: row?.branch_id || null,
    branch_name: row?.branch_name || null,
    is_ex_employee: row?.is_ex_employee === true,
    login_disabled: row?.login_disabled === true,
    previous_role: row?.previous_role || null,
  };

  // 1. Disabled accounts and revoked staff: denied before role or overrides are considered.
  if (row?.login_disabled === true) {
    return { ...base, role: 'view_only', ...allDenied(), disabled_modules: [], disabled_tabs: [], access_denied: true, denial_reason: 'login_disabled' };
  }

  if (row?.is_ex_employee === true && !isPlatformAdmin) {
    return { ...base, role: row.role || 'view_only', ...allDenied(), disabled_modules: [], disabled_tabs: [], access_denied: true, denial_reason: 'ex_employee' };
  }

  // 2. Platform admin safety valve (a role becomes admin through "Manage users").
  if (isPlatformAdmin) {
    return {
      ...base,
      role: row?.role || 'super_admin',
      ...allGranted(),
      disabled_modules: isPlatformAdmin ? [] : mergeDisabledModules(roleRecord?.disabled_modules, row?.module_overrides),
      disabled_tabs: isPlatformAdmin ? [] : mergeDisabledModules(roleRecord?.disabled_tabs, row?.tab_overrides),
      access_denied: false,
      denial_reason: null,
    };
  }

  // No staff row: no backend permission at all.
  if (!row) {
    return { ...base, role: null, ...allDenied(), disabled_modules: [], disabled_tabs: [], access_denied: true, denial_reason: 'no_permissions_row' };
  }

  // 3. Fail-safe: unknown/inactive role grants nothing.
  if (!roleRecord) {
    return { ...base, role: row.role || null, ...allDenied(), disabled_modules: [], disabled_tabs: [], access_denied: true, denial_reason: 'unknown_role' };
  }

  // 4. Live role permissions, then sparse per-user overrides.
  return {
    ...base,
    role: row.role,
    ...assignedFlags(row, roleRecord),
    disabled_modules: mergeDisabledModules(roleRecord.disabled_modules, row.module_overrides),
    disabled_tabs: mergeDisabledModules(roleRecord.disabled_tabs, row.tab_overrides),
    access_denied: false,
    denial_reason: null,
  };
}

/**
 * Assigned flags only — what the Roles tab and per-user overrides grant, nothing else.
 * No platform-admin or super_admin shortcut, so admin status never grants access here.
 * Revoked staff, no staff row or no active Role record → everything denied.
 * Used by the requisition flow, whose gates must follow assigned flags exactly.
 */
export function resolveAssignedPermissions({ row, roleRecord }) {
  const scope = { role: row?.role || null, branch_id: row?.branch_id || null };
  if (!row || row.is_ex_employee === true || row.login_disabled === true || !roleRecord) return { ...scope, ...allDenied(), access_denied: true };
  return { ...scope, ...assignedFlags(row, roleRecord), access_denied: false };
}

/** The caller's row + their live Role record: two indexed single-row reads, no join. */
async function loadPermissionSources(base44, user) {
  const email = String(user?.email || '').toLowerCase().trim();
  if (!email) return { row: null, roleRecord: null };

  const rows = await base44.asServiceRole.entities.UserPermissions.filter({ user_email: user.email });
  const row = rows.find((r) => String(r.user_email || '').toLowerCase().trim() === email) || rows[0] || null;

  let roleRecord = null;
  if (row?.role) {
    const roles = await base44.asServiceRole.entities.Role.filter({ role_key: row.role, is_active: true });
    roleRecord = roles[0] || null;
  }
  return { row, roleRecord };
}

/** Loads a caller's row + live Role record and resolves the effective set — cheap enough for a per-request gate. */
export async function getEffectivePermissions(base44, user) {
  const { row, roleRecord } = await loadPermissionSources(base44, user);
  return resolveEffectivePermissions({ row, roleRecord, isPlatformAdmin: user?.role === 'admin' });
}

/** Same loader, assigned flags only (see resolveAssignedPermissions). */
export async function getAssignedPermissions(base44, user) {
  return resolveAssignedPermissions(await loadPermissionSources(base44, user));
}