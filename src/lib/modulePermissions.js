import { APPROVAL_PERMISSION_GROUPS } from "@/components/approvals/approvalPermissions";

// Action permissions shown inside each module's card in Admin › Role Management,
// Users and Add Role, next to its sub-tabs. Only permissions the app still
// checks are listed; retired ones stay in the permission list but are hidden.
// section: sub-heading inside the module's Permissions dropdown.
const p = (key, label, description, section) => ({ key, label, description, section });

export const MODULE_PERMISSIONS = {
  catering: [
    p("catering_view", "View Catering", "Opens Catering, and Assets and Resources.", "Catering"),
    p("catering_edit", "Create / edit events, quotes & packages", null, "Catering"),
    p("catering_finance", "Issue credit notes", null, "Catering"),
    p("catering_settings_edit", "Edit Catering settings", "Lists & Settings and Payment Policies, including the extra-items limit; also bulk-deletes equipment.", "Catering"),
    p("requisition_view", "View requisitions", "Requisitions, their lines, history and batches, and their notifications.", "Requisitions"),
    p("requisition_submit", "Chef: request & receive", "Initial and additional requisitions, counters, batch splits and receipt.", "Requisitions"),
    p("requisition_respond", "Inventory: respond", "Confirm, edit or decline requested lines within allowance.", "Requisitions"),
    p("requisition_release", "Release batches", "Issues scheduled batches' stock from inventory.", "Requisitions"),
  ],
  kds: [p("kds_view", "Kitchen display"), p("kds_bar_view", "Bar display")],
  selling_priority: [p("selling_priority_manage", "Set selling priority", "Kitchen display → kitchen items, Bar display → bar items; Settings tabs → every station.")],
  call_center: [p("pos_call_center", "Call center mode", "Phone orders for cashier approval, without the till.")],
  captain_orders: [p("pos_captain", "Captain mode", "Table orders for cashier approval, without the till.")],
  delivery: [p("delivery_view", "View / manage delivery orders")],
  hr_attendance: [p("attendance_checkin", "Check in / check out"), p("hr_view_own", "View own HR data")],
  hr_employees: [p("hr_view_all", "View all employees' data"), p("hr_edit", "Create / edit employee records")],
  crm: [p("clients_view", "View clients"), p("clients_edit", "Edit client data"), p("clients_merge", "Merge duplicate clients", "High risk."), p("crm_full_view", "Full CRM access", "Every CRM panel and action.")],
  marketing: [p("admin_actions", "Manage campaigns and loyalty requests"), p("social_media_view", "Social Media connections", "Admin › Social Media."), p("marketing_view_segments", "View marketing data", "Leads, client segments, campaigns and website traffic.")],
  manufacturing: [p("manufacturing_view", "View manufacturing & batches"), p("manufacturing_edit", "Manage production recipes")],
  butchery: [p("butchery_view", "View butchery"), p("butchery_edit", "Manage butchery records")],
  cashier: [p("cashier_view", "View sessions"), p("cashier_edit", "Open / close sessions"), p("cashier_audit_view", "View cashier audit log")],
  financial: [
    p("financial_view", "View financial data"), p("finance_edit", "Edit financial records"),
    p("finance_company_manage", "Manage companies and access", "Also opens Admin › Companies."),
    p("finance_accounts_manage", "Manage chart of accounts"), p("finance_journal_create", "Prepare journals"),
    p("finance_journal_approve", "Approve or reject journals"), p("finance_period_close", "Lock posting periods"),
    p("finance_reconstruct", "Prepare historical reconstruction"), p("finance_audit_view", "View detailed finance audit history"),
  ],
  petty_cash_custody: [
    p("custody_view", "View Petty Cash & Custody", "Opens Operations › Petty Cash & Custody balances and movements."),
    p("custody_manage", "Submit custody requests & configure Custody GL account", "Submit issue, replenishment and settlement requests, and configure CUSTODY_CONTROL_ACC."),
    p("custody_approve", "Approve / reject custody requests & settlements", "System Role Group approval gate for custody funding and returns."),
  ],
  expenses_module: [
    p("expenses_view", "View Expenses & disbursements", "Opens Operations › Expenses."),
    p("expenses_edit", "Submit expense & vendor disbursements", "Record operating expenses and direct vendor payments from Custody or Payment Methods."),
    p("expenses_config", "Configure expense names & GL account mappings", "Manage configurable Expense Types and their General Ledger posting accounts."),
    p("expense_approve", "Approve / reject expense & vendor disbursements", "System Role Group approval gate for expense and vendor disbursements."),
  ],
  inventory: [p("inventory_view", "View inventory"), p("inventory_edit", "Create / edit items"), p("inventory_manage", "Inventory management (legacy access)")],
  expiry: [p("expiry_manage", "Manage expiry reports")],
  purchases: [
    p("purchase_view", "View invoices / orders"),
    p("purchase_edit", "Create / edit"),
    p("purchase_approve", "Approve purchase orders"),
    p("supplier_payment_record", "Pay suppliers", "Record full or partial supplier payments and upload payment confirmations."),
  ],
  support_customization: [
    p(
      "support_customization",
      "Open Support Customization",
      "Opens the Support Customization workspace. Each setting inside still requires its own underlying permission."
    ),
  ],
  pos: [
    p("pos_view", "View / access POS", "Also opens Call Center and Captain Orders."), p("pos_access", "POS access (legacy)"),
    p("pos_edit", "Edit orders"), p("pos_delete", "Delete / void items"), p("pos_approve", "Approve discounts / special actions"),
  ],
  menu: [
    p("menu_view", "View menu", "Any Menu Management permission opens Operations › Menu Management."),
    p("menu_create", "Create items"), p("menu_edit", "Edit items"), p("menu_delete", "Delete items"),
  ],
  analytics: [p("analytics_view", "View analytics")],
  sales_reporting: [p("sales_view", "Open POS / Counter Sales")],
  cashback: [p("rule_history_view", "Cashback rule history", "Admin › Rule History.")],
  // Manage users makes everyone holding the role a full administrator.
  users: [{ ...p("users_manage", "Manage users — full administrator", "Makes everyone with this role a full administrator: every permission and every module, whatever else is set here."), warning: true }],
  genmo: [p("purchases_view", "View loyalty purchase submissions"), p("purchases_approve", "Approve / reject loyalty purchases")],
  rewards: [p("redemptions_view", "View redemptions"), p("rewards_manage", "Manage rewards", "Redeem rewards for clients and see the full cashback history.")],
  registrations: [p("registrations_view", "View registration requests")],
  approvals: APPROVAL_PERMISSION_GROUPS.flatMap((g) =>
    g.items.map((i) => ({ ...i, section: g.title.replace("Approvals — ", "") }))),
};

// Admin panel access is not a module: shown as its own card in the Admin group.
// adminSection: the Admin tabs that flag opens are listed live from the tabs.
export const ADMIN_PANEL = {
  key: "admin_panel", label: "Admin Panel", group: "admin",
  description: "Which parts of the Admin panel this role opens. Each Admin tab still follows its own module and sub-tab switch.",
  permissions: [
    { key: "admin_settings", label: "Settings tabs", adminSection: "settings", section: "Admin panel" },
    { key: "admin_operations", label: "Operations tabs", adminSection: "operations", section: "Admin panel" },
    { key: "admin_systems", label: "Systems tabs", adminSection: "systems", section: "Admin panel" },
    p("settings_edit", "Save settings", "Saves system settings, email and notification settings.", "Admin tools"),
    p("clear_cache_view", "Clear Cache", "Admin › Clear Cache.", "Admin tools"),
  ],
};

// Admin tabs only platform administrators open (same rule as the Admin page).
const ADMIN_ONLY_TABS = ["modules", "users", "roles", "vendor-support"];

export function adminSectionTabs(tabs, section) {
  return tabs.filter((t) => t.section === section && !t.permission && !ADMIN_ONLY_TABS.includes(t.id)).map((t) => t.label);
}

// Every permission shown in the editors (used for the "N of M" counts).
export const CATALOG_KEYS = [...new Set([
  ...Object.values(MODULE_PERMISSIONS).flat().map((i) => i.key),
  ...ADMIN_PANEL.permissions.map((i) => i.key),
])];