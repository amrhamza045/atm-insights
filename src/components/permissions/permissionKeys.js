/**
 * The app's one permission pool: exactly the permissions Admin › Role Management
 * lists. Keep in step with base44/shared/resolveEffectivePermissions.js.
 *
 * Lives here (not in an admin UI file) because the permission resolver — the
 * lowest layer of the access system — needs it, and the resolver must not depend
 * on an admin screen. UserPermissionsManager re-exports it for its own consumers.
 */
export const ALL_PERMISSION_KEYS = [
  "menu_view", "menu_create", "menu_edit", "menu_delete",
  "purchases_view", "purchases_approve",
  "redemptions_view", "redemptions_approve",
  "payouts_approve",
  "registrations_view", "registrations_approve",
  "clients_view", "clients_edit", "clients_merge",
  "rewards_manage",
  "analytics_view", "financial_view", "finance_edit", "users_manage", "cashier_audit_view",
  "finance_company_manage", "finance_accounts_manage", "finance_journal_create", "finance_journal_approve", "finance_period_close", "finance_reconstruct", "finance_audit_view",
  "pos_view", "pos_edit", "pos_delete", "pos_approve",
  "cashier_view", "cashier_edit",
  "inventory_view", "inventory_edit",
  "expiry_manage",
  "manufacturing_view", "manufacturing_edit", "butchery_view", "butchery_edit",
  "purchase_view", "purchase_edit", "purchase_approve", "supplier_payment_record",
  "admin_settings", "admin_actions", "admin_operations", "admin_systems",
  "pos_access", "inventory_manage", "settings_edit",
  "sales_view",
  "delivery_view", "kds_view", "kds_bar_view",
  "hr_view_own", "hr_view_all", "hr_edit", "hr_attendance_approve",
  "attendance_checkin", "catering_view", "catering_edit", "catering_approve", "catering_finance",
  "marketing_view_segments", "social_media_view",
  "clear_cache_view", "rule_history_view",
  "expense_approve", "cashier_purchase_approve", "recharge_approve",
  "level_upgrade_approve", "return_approve", "cashback_dist_approve", "waste_approve",
  "delivery_bonus_approve", "cashier_session_approve", "deposit_withdrawal_approve", "catering_payment_approve",
  "catering_quote_approve", "catering_reservation_approve", "catering_booking_approve",
  "requisition_view", "requisition_submit", "requisition_respond", "requisition_release", "requisition_approve", "catering_settings_edit",
  "support_customization", "review_moderate",
  "crm_full_view", "selling_priority_manage", "pos_call_center", "pos_captain",
  "custody_view", "custody_manage", "custody_approve",
  "expenses_view", "expenses_edit", "expenses_config",
  "approval_self_bypass"
];

export const allDenied = () => Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false]));
export const allGranted = () => Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true]));