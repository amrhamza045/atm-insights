/**
 * Computes and writes each account's permission copy using the SAME resolver
 * and central rule the server actions use, and logs every sync.
 */
import { resolveEffectivePermissions, resolveAssignedPermissions, ALL_PERMISSION_KEYS } from './resolveEffectivePermissions.js';
import { isCentralAdmin, isSafetyValveEmail, isSafetyValveConfigured, targetPlatformRole } from './platformRole.js';
import { readCopy, writeCopy, PHASE4_FLAGS, APPROVAL_FLAGS, REQUISITION_FLAGS } from './permissionCopyStore.js';

const norm = (e) => String(e || '').toLowerCase().trim();

// Every catering duty reads catering records: the Catering screen and the
// catering approval queues all show events, quotes and payments.
const CATERING_READ_KEYS = ['catering_view', 'catering_edit', 'catering_approve', 'catering_finance', 'catering_settings_edit',
  'catering_quote_approve', 'catering_reservation_approve', 'catering_booking_approve', 'catering_payment_approve', 'deposit_withdrawal_approve'];

export async function loadSyncContext(svc) {
  const [rows, roles, employees, drivers, clients] = await Promise.all([
    svc.entities.UserPermissions.list('-created_date', 2000),
    svc.entities.Role.list('sort_order', 500),
    svc.entities.Employee.list('-created_date', 5000),
    svc.entities.DeliveryPerson.list('-created_date', 2000),
    svc.entities.Client.list('-created_date', 10000),
  ]);
  const byEmail = (list) => new Map(list.filter((x) => x.email).map((x) => [norm(x.email), x.id]));
  return {
    rowBy: new Map(rows.map((r) => [norm(r.user_email), r])), roles,
    employeeBy: byEmail(employees), driverBy: byEmail(drivers), clientBy: byEmail(clients),
  };
}

/** Expected copy for one account — mirrors getEffectivePermissions exactly. */
export function computeCopy(user, ctx) {
  const row = ctx.rowBy.get(norm(user.email)) || null;
  const roleRecord = row?.role
    ? ctx.roles.find((r) => r.role_key === row.role && r.is_active === true) || null
    : null;
  const eff = resolveEffectivePermissions({ row, roleRecord, isPlatformAdmin: user.role === 'admin' });
  // The requisition copies follow assigned flags only (Roles tab + per-user overrides): admin status grants none.
  const assigned = resolveAssignedPermissions({ row, roleRecord });
  return {
    flags: Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, eff[k] === true])),
    role: row?.role || null,
    is_central_admin: isCentralAdmin(user, eff) === true,
    branch_id: row?.branch_id || null,
    // Flat yes/no copies the data rules read (always true/false, never empty).
    catering_view: CATERING_READ_KEYS.some((k) => eff[k] === true),
    catering_edit: eff.catering_edit === true,
    catering_finance: eff.catering_finance === true,
    catering_approve: eff.catering_approve === true,
    has_branch: !!row?.branch_id,
    // Staff account = has a role key; the Role catalog rule reads this.
    has_role: !!row?.role,
    hr_view: eff.hr_view_all === true,
    hr_edit: eff.hr_edit === true,
    hr_approve: eff.hr_attendance_approve === true,
    finance_view: eff.financial_view === true,
    finance_edit: eff.finance_edit === true,
    cashier_view: eff.cashier_view === true,
    cashier_edit: eff.cashier_edit === true || eff.pos_view === true,
    cashier_audit: eff.cashier_audit_view === true,
    settings_edit: eff.settings_edit === true,
    users_manage: eff.users_manage === true,
    admin_operations: eff.admin_operations === true,
    admin_actions: eff.admin_actions === true,
    butchery_view: eff.butchery_view === true,
    butchery_edit: eff.butchery_edit === true,
    purchases_approve: eff.purchases_approve === true,
    admin_systems: eff.admin_systems === true,
    // Requisition read access: granted when the user holds requisition_view or any action/approval requisition flag (so an approver role with requisition_approve can read pending requisitions).
    // Written on every sync; kept out of FLAT_FIELDS so its first fill isn't logged as drift.
    requisition_view: assigned.requisition_view === true || assigned.requisition_approve === true || assigned.requisition_submit === true || assigned.requisition_respond === true || assigned.requisition_release === true,
    ...Object.fromEntries(APPROVAL_FLAGS.map((k) => [k, eff[k] === true])),
    ...Object.fromEntries(REQUISITION_FLAGS.map((k) => [k, (k.startsWith('requisition_') ? assigned : eff)[k] === true])),
    // Module copies (MODULE_FLAGS) read by the data rules.
    is_staff: ALL_PERMISSION_KEYS.some((k) => eff[k] === true),
    kds_view: eff.kds_view === true || eff.kds_bar_view === true,
    manufacturing_view: eff.manufacturing_view === true || eff.manufacturing_edit === true,
    manufacturing_edit: eff.manufacturing_edit === true,
    menu_edit: eff.menu_create === true || eff.menu_edit === true || eff.menu_delete === true,
    delivery_view: eff.delivery_view === true,
    clients_edit: eff.clients_edit === true,
    analytics_view: eff.analytics_view === true || eff.financial_view === true || eff.sales_view === true,
    marketing_view: eff.marketing_view_segments === true || eff.social_media_view === true,
    rewards_manage: eff.rewards_manage === true,
    review_moderate: eff.review_moderate === true,
    admin_settings: eff.admin_settings === true,
    catering_quote_approve: eff.catering_quote_approve === true,
    support_customization: eff.support_customization === true,
    // Call center / captain mode may stage pending orders for cashier approval.
    order_taking: eff.pos_call_center === true || eff.pos_captain === true,
    // From the SAFETY_VALVE_EMAIL secret; if the secret is missing, keep the stored value.
    is_safety_valve: isSafetyValveConfigured() ? isSafetyValveEmail(user.email) : user.perm_is_safety_valve === true,
    employee_id: ctx.employeeBy?.get(norm(user.email)) || '__none__',
    delivery_person_id: ctx.driverBy?.get(norm(user.email)) || '__none__',
    client_id: ctx.clientBy?.get(norm(user.email)) || '__none__',
  };
}

const FLAT_FIELDS = ['catering_view', 'catering_edit', 'catering_finance', 'catering_approve', 'has_branch', 'has_role',
  ...PHASE4_FLAGS, 'employee_id', 'delivery_person_id', 'client_id', 'is_safety_valve'];

/** Field names where the stored copy differs from the expected one. */
export function diffCopy(stored, expected) {
  const out = [];
  ALL_PERMISSION_KEYS.forEach((k) => {
    if ((stored.flags?.[k] === true) !== expected.flags[k]) out.push(`perm_flags.${k}`);
  });
  if ((stored.role ?? null) !== expected.role) out.push('perm_role');
  if (stored.is_central_admin !== expected.is_central_admin) out.push('perm_is_central_admin');
  if ((stored.branch_id ?? null) !== expected.branch_id) out.push('perm_branch_id');
  FLAT_FIELDS.forEach((k) => { if (stored[k] !== expected[k]) out.push(`perm_${k}`); });
  return out;
}

/**
 * Keeps the account's platform role in step with its role on every sync:
 * Super Admin or a role with Manage users → administrator, otherwise regular user.
 * A failed role change is logged and never blocks the permission copy.
 */
async function alignPlatformRole(svc, user, ctx) {
  const row = ctx.rowBy.get(norm(user.email)) || null;
  const roleRecord = row?.role ? ctx.roles.find((r) => r.role_key === row.role) || null : null;
  const target = targetPlatformRole(user, row, roleRecord);
  if (!target || target === user.role) return user;
  try {
    await svc.entities.User.update(user.id, { role: target });
  } catch (e) {
    console.error('platform role update failed', user.email, e?.message || e);
    return user;
  }
  await svc.entities.AuditLog.create({
    admin_id: 'system',
    admin_email: 'system',
    action_type: 'update',
    entity_type: 'User',
    entity_id: user.id,
    entity_name: user.email,
    action_description: `Administrator access ${target === 'admin' ? 'granted' : 'removed'} to match the account's role (${row?.role || 'none'})`,
    changes: { role: { from: user.role || null, to: target } },
    status: 'success',
  }).catch((e) => console.error('audit log failed', e?.message || e));
  return { ...user, role: target };
}

export async function syncUser(svc, user, ctx, trigger) {
  const existingRow = ctx.rowBy.get(norm(user.email)) || null;
  if (existingRow?.login_disabled === true && !isSafetyValveEmail(user.email)) {
    let deleted = false;
    let deleteErr = null;
    try {
      await svc.entities.User.delete(user.id);
      deleted = true;
    } catch (e) {
      deleteErr = e?.message || String(e);
      if (user.role !== 'user') {
        await svc.entities.User.update(user.id, { role: 'user' }).catch(() => {});
        user = { ...user, role: 'user' };
      }
    }
    await svc.entities.AuditLog.create({
      admin_id: 'system',
      admin_email: 'system',
      action_type: 'delete',
      entity_type: 'User',
      entity_id: user.id,
      entity_name: user.email,
      action_description: deleted
        ? `Blocked sign-in and deleted re-created account for disabled user ${user.email}`
        : `Blocked disabled user ${user.email} (account delete refused: ${deleteErr})`,
      status: deleted ? 'success' : 'failed',
    }).catch(() => {});
    if (deleted) {
      return { email: user.email, ok: true, blocked: true, error: null, mismatch: [] };
    }
  }
  user = await alignPlatformRole(svc, user, ctx);
  const expected = computeCopy(user, ctx);
  const stored = await readCopy(svc, user);
  // Only a previously-synced copy counts as a mismatch (first fill is not tampering).
  const mismatch = stored.synced_at ? diffCopy(stored, expected) : [];
  let error = null;
  let attempts = 0;
  for (attempts = 1; attempts <= 2; attempts++) {
    try {
      await writeCopy(svc, user, { ...expected, synced_at: new Date().toISOString() });
      error = null;
      break;
    } catch (e) {
      error = e?.message || String(e);
    }
  }
  attempts = Math.min(attempts, 2);
  await svc.entities.PermissionSyncLog.create({
    user_id: user.id,
    user_email: user.email,
    role: expected.role,
    trigger,
    status: error ? 'failed' : 'success',
    error_message: error,
    attempts,
    mismatch_before: mismatch.length > 0,
    mismatch_fields: mismatch.slice(0, 100),
    synced_at: new Date().toISOString(),
  });
  return { email: user.email, ok: !error, error, mismatch };
}

export async function syncUsers(svc, users, trigger) {
  const ctx = await loadSyncContext(svc);
  const results = [];
  for (const u of users) results.push(await syncUser(svc, u, ctx, trigger));
  return results;
}

/**
 * Layer 2 drift self-heal, run beside a server permission check. At most one
 * check per user per throttle window (ScheduleSettings.action_heal_throttle_minutes,
 * default 180). Writes + logs ONLY when the stored copy differs. Never throws.
 */
export async function healIfDrifted(svc, user) {
  try {
    if (!user?.id) return;
    const settings = (await svc.entities.ScheduleSettings.filter({ setting_key: 'schedules' }))[0];
    const minutes = Number(settings?.action_heal_throttle_minutes ?? 180);
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    const recent = await svc.entities.PermissionSyncLog.filter(
      { user_id: user.id, trigger: 'action_check', synced_at: { $gte: since } }, '-synced_at', 1);
    if (recent.length) return;
    const ctx = await loadSyncContext(svc);
    const stored = await readCopy(svc, user);
    const expected = computeCopy(user, ctx);
    const mismatch = stored.synced_at ? diffCopy(stored, expected) : [];
    if (!mismatch.length) {
      // Record the check (no write) so the throttle window applies.
      await svc.entities.PermissionSyncLog.create({
        user_id: user.id, user_email: user.email, role: expected.role, trigger: 'action_check',
        status: 'success', attempts: 0, mismatch_before: false, mismatch_fields: [],
        synced_at: new Date().toISOString(),
      });
      return;
    }
    await syncUser(svc, user, ctx, 'action_check');
  } catch (e) {
    console.error('healIfDrifted failed', e?.message || e);
  }
}

/** Accounts that hold a role key (for role edits). */
export async function usersWithRole(svc, roleKey) {
  const rows = await svc.entities.UserPermissions.filter({ role: roleKey });
  const emails = new Set(rows.map((r) => norm(r.user_email)));
  const users = await svc.entities.User.list('-created_date', 1000);
  return users.filter((u) => emails.has(norm(u.email)));
}