/**
 * THE ONLY place that reads or writes the permission copy.
 * Today the copy lives in the five perm_* fields on the User account.
 * To move it to a separate locked record (Option B), change only this file.
 * Always pass an elevated (service-role) client.
 */
/** Permission keys copied 1:1 (perm_<key> = effective <key>) for the approval data rules. */
export const APPROVAL_FLAGS = ['expense_approve', 'cashier_purchase_approve', 'payouts_approve',
  'purchase_submission_approve', 'recharge_approve', 'registrations_approve', 'registrations_view',
  'level_upgrade_approve', 'redemptions_approve', 'redemptions_view', 'return_approve', 'cashback_dist_approve',
  'purchase_approve', 'purchase_view', 'purchase_edit', 'supplier_payment_record', 'inventory_view', 'inventory_edit', 'waste_approve',
  'expiry_manage', 'delivery_bonus_approve', 'cashier_session_approve', 'purchases_view', 'clients_view'];

/** Phase 4 flat yes/no copies (perm_<name> on the account). */
export const PHASE4_FLAGS = ['hr_view', 'hr_edit', 'hr_approve', 'finance_view', 'finance_edit',
  'cashier_view', 'cashier_edit', 'cashier_audit', 'settings_edit', 'users_manage', 'admin_operations', 'admin_actions', 'butchery_view', 'butchery_edit', 'purchases_approve', 'admin_systems',
  ...APPROVAL_FLAGS];

/**
 * Requisition / catering-settings keys copied 1:1 (perm_<key> = effective <key>) for the requisition
 * and catering-settings data rules. Kept out of drift checks (like requisition_view) so their first
 * fill isn't logged as tampering; the fields are write-locked on the account anyway.
 */
export const REQUISITION_FLAGS = ['requisition_submit', 'requisition_respond', 'requisition_approve', 'catering_settings_edit'];

/**
 * Module copies for the data rules (perm_<name> on the account), computed in permissionCopySync
 * from the effective set. is_staff = holds any staff permission (customers and ex-employees: false).
 * Kept out of drift checks like the requisition flags; the fields are write-locked on the account.
 */
export const MODULE_FLAGS = ['is_staff', 'kds_view', 'manufacturing_view', 'manufacturing_edit', 'menu_edit',
  'delivery_view', 'clients_edit', 'analytics_view', 'marketing_view', 'rewards_manage', 'review_moderate',
  'admin_settings', 'catering_quote_approve', 'support_customization', 'order_taking'];

export async function readCopy(svc, user) {
  return {
    flags: user?.perm_flags || null,
    role: user?.perm_role ?? null,
    is_central_admin: user?.perm_is_central_admin ?? null,
    branch_id: user?.perm_branch_id ?? null,
    synced_at: user?.perm_synced_at || null,
    catering_view: user?.perm_catering_view ?? null,
    catering_edit: user?.perm_catering_edit ?? null,
    catering_finance: user?.perm_catering_finance ?? null,
    catering_approve: user?.perm_catering_approve ?? null,
    has_branch: user?.perm_has_branch ?? null,
    has_role: user?.perm_has_role ?? null,
    ...Object.fromEntries(PHASE4_FLAGS.map((k) => [k, user?.[`perm_${k}`] ?? null])),
    ...Object.fromEntries(REQUISITION_FLAGS.map((k) => [k, user?.[`perm_${k}`] ?? null])),
    ...Object.fromEntries(MODULE_FLAGS.map((k) => [k, user?.[`perm_${k}`] ?? null])),
    employee_id: user?.perm_employee_id ?? null,
    delivery_person_id: user?.perm_delivery_person_id ?? null,
    client_id: user?.perm_client_id ?? null,
    is_safety_valve: user?.perm_is_safety_valve ?? null,
  };
}

export async function writeCopy(svc, user, copy) {
  await svc.entities.User.update(user.id, {
    perm_flags: copy.flags,
    perm_role: copy.role,
    perm_is_central_admin: copy.is_central_admin,
    perm_branch_id: copy.branch_id,
    perm_synced_at: copy.synced_at,
    perm_catering_view: copy.catering_view === true,
    perm_catering_edit: copy.catering_edit === true,
    perm_catering_finance: copy.catering_finance === true,
    perm_catering_approve: copy.catering_approve === true,
    perm_has_branch: copy.has_branch === true,
    perm_has_role: copy.has_role === true,
    perm_requisition_view: copy.requisition_view === true,
    ...Object.fromEntries(PHASE4_FLAGS.map((k) => [`perm_${k}`, copy[k] === true])),
    ...Object.fromEntries(REQUISITION_FLAGS.map((k) => [`perm_${k}`, copy[k] === true])),
    ...Object.fromEntries(MODULE_FLAGS.map((k) => [`perm_${k}`, copy[k] === true])),
    perm_employee_id: copy.employee_id || '__none__',
    perm_delivery_person_id: copy.delivery_person_id || '__none__',
    perm_client_id: copy.client_id || '__none__',
    perm_is_safety_valve: copy.is_safety_valve === true,
  });
}