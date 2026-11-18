// One complete list of the app's modules, grouped like the top bar.
// key: the stored switch (never rename one — closures and role limits use it)
// routes: screens the switch locks (a screen several modules list stays open
//   while any of them is open) · parent: closing it closes this one too ·
// navOnly: the switch only hides a top-bar link; the page itself stays open.
// Each screen's sub-tabs are listed in screenTabs.js.

export const GROUP_ORDER = ["catering", "operations", "analytics", "help", "admin", "customer", "features"];

export const GROUP_LABELS = {
  catering: "Catering",
  operations: "Operations",
  analytics: "Analytics",
  help: "Help",
  admin: "Admin",
  customer: "Customer-facing screens",
  features: "Feature switches",
};

export const MODULES = [
  // Catering
  { key: "catering", label: "Catering", description: "Events, quotes, deposits, planning, event day and catering settings.", group: "catering", routes: ["Catering"] },
  { key: "my_custody", label: "My Custody", description: "Staff screen for the catering equipment and stock each person holds.", group: "catering", routes: ["MyCustody"], parent: "catering" },

  // Operations (top-bar Operations menu, then screens opened from other places)
  { key: "kds", label: "Kitchen Display (KDS)", description: "Kitchen and bar station screens and the Head Chef Production Board.", group: "operations", routes: ["KitchenDisplay"] },
  { key: "delivery", label: "Delivery", description: "Delivery Portal, drivers' My Deliveries, delivery companies, zones and bonuses.", group: "operations", routes: ["DeliveryPortal", "DeliveryDriverDashboard"] },
  { key: "hr_attendance", label: "HR · Attendance", description: "Staff sign-in by face scan and location, plus the attendance tabs in HR.", group: "operations", routes: ["EmployeeAttendance", "HRHub"] },
  { key: "operational_meetings", label: "Operational Meetings", description: "Meeting minutes, decisions and follow-ups.", group: "operations", routes: ["OperationalMeetings"], parent: "hr_employees" },
  { key: "approvals", label: "Approvals", description: "One queue for every request waiting for approval.", group: "operations", routes: ["Approvals"] },
  { key: "crm", label: "CRM", description: "Clients, leads, follow-ups, guest referrals with commissions, and campaigns.", group: "operations", routes: ["CRM"] },
  { key: "manufacturing", label: "Manufacturing", description: "Recipes and production orders.", group: "operations", routes: ["Manufacturing"] },
  { key: "butchery", label: "Butchery", description: "Animals, slaughter, breakdown, raw materials and rework.", group: "operations", routes: ["Butchery"] },
  { key: "cashier", label: "Cashier", description: "Cashier sessions, orders, deposits, expenses and visa credits.", group: "operations", routes: ["Cashier"] },
  { key: "financial", label: "Finance", description: "Chart of accounts, journals, statements, tax and financial analytics.", group: "operations", routes: ["Finance"] },
  { key: "petty_cash_custody", label: "Petty Cash & Custody", description: "Standalone staff custody balances, funding requests, settlements, and unified Custody GL summary configuration.", group: "operations", routes: ["PettyCashCustody"] },
  { key: "expenses_module", label: "Expenses", description: "Standalone operating expense and vendor payment disbursements from Staff Custody or Payment Methods, with configurable expense types and GL account mappings.", group: "operations", routes: ["Expenses"] },
  { key: "assets_resources", label: "Assets and Resources", description: "Catering equipment, staffing roles and vehicles with their predefined costs and allocation across events. Closes with Catering.", group: "operations", routes: ["AssetsResources"], parent: "catering" },
  { key: "inventory", label: "Inventory", description: "Stock items, waste, stock admin and forecasting.", group: "operations", routes: ["InventoryHub", "InventoryManagement"] },
  { key: "selling_priority", label: "Selling Priority", description: "Items to sell first before they expire.", group: "operations", routes: ["SellingPriority"], parent: "inventory" },
  { key: "expiry", label: "Raw Material Expiry", description: "Expiry reports, also the Expiry tab in Inventory.", group: "operations", routes: ["ExpiryReports"] },
  { key: "purchases", label: "Purchases", description: "Recommended cart, kitchen requests, purchase orders and invoices.", group: "operations", routes: ["PurchasesHub", "Purchases"] },
  { key: "suppliers", label: "Suppliers", description: "Supplier records, reliability and price advice, in Purchases and on each supplier's page.", group: "operations", routes: ["SupplierHub"] },
  { key: "hr_employees", label: "HR · Employees", description: "Employees, departments, discipline and meetings in HR.", group: "operations", routes: ["HRHub"] },
  { key: "hr_payroll", label: "HR · Payroll", description: "Payroll, payroll dashboard, penalties, borrowings and the advance policy in HR.", group: "operations", routes: ["HRHub"] },
  { key: "hr_shifts", label: "HR · Shifts", description: "Shift planning in HR.", group: "operations", routes: ["HRHub"] },
  { key: "kitchen_manual", label: "Kitchen & Bar Manual", description: "Operations manual and per-station recipe sections.", group: "operations", routes: ["KitchenBarManual"] },
  { key: "pos", label: "POS", description: "Point of sale, also the Confirm & Start tab in Catering.", group: "operations", routes: ["POS"] },
  { key: "captain_orders", label: "Captain Orders", description: "Floor captain table orders awaiting cashier approval.", group: "operations", routes: ["CaptainPOS"] },
  { key: "call_center", label: "Call Center", description: "Phone order entry and the call center POS.", group: "operations", routes: ["CallCenterPOS"] },
  { key: "menu", label: "Menu Management", description: "Menu items, sections, categories and options.", group: "operations", routes: ["MenuManagement"] },
  { key: "tables", label: "Tables", description: "Dine-in table setup in Admin.", group: "operations" },

  // Analytics
  { key: "analytics", label: "Analytics & Insights", description: "Covers the Analytics menu: closing it also closes the Executive Dashboard and POS / Counter Sales.", group: "analytics" },
  { key: "executive_dashboard", label: "Executive Dashboard", description: "Business reports across every module.", group: "analytics", routes: ["ExecutiveDashboard"], parent: "analytics" },
  { key: "sales_reporting", label: "POS / Counter Sales", description: "Counter sales reports: daily, monthly, items, discounts and delivery companies.", group: "analytics", routes: ["Sales"], parent: "analytics" },
  { key: "cashback", label: "Cashback", description: "Cashback History plus cashback settings, rules, approvals and reports.", group: "analytics", routes: ["CashbackHistory"], parent: "genmo" },
  { key: "client_analytics", label: "Client Analytics", description: "Management summary of the client base: new clients, segments and client health.", group: "analytics", routes: ["ClientAnalytics"], parent: "crm" },
  { key: "manufacturing_analytics", label: "Manufacturing Analytics", description: "Production batches planned for catering events, plus sourcing comparison.", group: "analytics", routes: ["ManufacturingAnalytics"], parent: "manufacturing" },
  { key: "menu_profitability", label: "Menu Engineering", description: "Menu profitability matrix, item analysis and pricing tools.", group: "analytics", routes: ["MenuEngineering"], parent: "menu" },
  { key: "butchery_analytics", label: "Butchery Analytics", description: "Butchery yields and sourcing comparison.", group: "analytics", routes: ["ButcheryAnalytics"], parent: "butchery" },
  { key: "food_cost", label: "Food Cost Analysis", description: "Cost Analysis in Inventory and Food Cost Analysis in Menu Management.", group: "analytics" },
  { key: "branch_comparison", label: "Branch Comparison", description: "Side-by-side branch performance.", group: "analytics", routes: ["ComparativeBranchReport"], parent: "multi_branch" },

  // Help
  { key: "ai_assistant", label: "AI Assistant", description: "The AI assistant and support chat in Help.", group: "help", routes: ["SupportBot"] },
  { key: "documentation", label: "Module & User Manuals", description: "Module Manual and User Manual in Help, plus the Admin program export.", group: "help", routes: ["SupportBot", "VeraKit360Manual", "SystemManual"] },

  // Admin
  { key: "branches", label: "Companies, Branches & Printers", description: "Companies and the branches each one owns, plus printer setup.", group: "admin" },
  { key: "users", label: "Users & Roles", description: "Users, roles and granular permissions.", group: "admin" },
  { key: "restaurant_info", label: "System Settings", description: "Restaurant info and timezone.", group: "admin" },
  { key: "preparation", label: "Preparation Areas", description: "Kitchen and bar stations used by the KDS, menu and manual.", group: "admin" },
  { key: "vendor-support", label: "Vendor / Support Info", description: "Software vendor contact details (vendor account only).", group: "admin" },
  { key: "support_customization", label: "Support Customization", description: "Permission-gated customization workspace for site, branch, and operational settings, in Admin › Business Setup.", group: "admin" },
  { key: "marketing", label: "Marketing Campaigns", description: "Campaigns and social media connections.", group: "admin" },
  { key: "whatsapp_sms", label: "WhatsApp & SMS", description: "SMS notifications and POS messaging settings.", group: "admin" },
  { key: "email_integration", label: "Email", description: "Email settings.", group: "admin" },
  { key: "recharges", label: "Balance Recharge & Wallet", description: "Recharge approvals and the client wallet.", group: "admin" },
  { key: "audit", label: "Audit Log", description: "Audit log of sensitive changes.", group: "admin" },
  { key: "data_tools", label: "Data Backup & Maintenance", description: "Data clone, full CSV export, staff backup, test-data deletion and go-live cleanup.", group: "admin", routes: ["StaffDataBackup", "BulkDeleteTestData", "GoLiveCleanup"] },
  { key: "data-cleanup", label: "Branch Reassignment", description: "Move unassigned records to a branch.", group: "admin", parent: "multi_branch" },
  { key: "permission_check", label: "Permission Check", description: "Compare each account's stored permissions with its role.", group: "admin", routes: ["PermissionCopyCheck"] },
  { key: "marketing_brochure", label: "Marketing Brochure", description: "Printable app brochure in English and Arabic.", group: "admin", routes: ["AppMarketingBrochure"] },

  // Customer-facing screens
  { key: "home", label: "Home link", description: "The Home link in the staff top bar. The public home page itself always stays open.", group: "customer", navOnly: true },
  { key: "my_profile", label: "My Profile link", description: "The My Profile link in the staff top bar. The My Profile page and its tabs stay open for customers.", group: "customer", navOnly: true },
  { key: "website_menu", label: "Website Packages", description: "The packages catalogue on the public home page, and website orders in POS.", group: "customer" },
  { key: "catering_portal", label: "Catering Portal", description: "Customers' portal for their event quotes, payments and documents.", group: "customer", routes: ["CateringPortal"], parent: "catering" },
  { key: "rewards", label: "Rewards & Redemptions", description: "Rewards page, reward catalogue, tiers, milestones and redemptions.", group: "customer", routes: ["Rewards"], parent: "genmo" },
  { key: "referrals", label: "Referrals", description: "Referral network, referral tree, leaderboard and top referrers.", group: "customer", routes: ["ReferralTree", "ReferralLeaderboard"], parent: "genmo" },
  { key: "registrations", label: "Registration & Onboarding", description: "Registration levels and approvals.", group: "customer", parent: "genmo" },

  // Feature switches
  { key: "genmo", label: "GenMo Program", description: "Master switch for the GenMo loyalty program: cashback, referrals, rewards, client registration and the program info page.", group: "features", routes: ["LoyaltyProgramInfo"] },
  { key: "multi_branch", label: "Multi-Branch Mode", description: "Run several branches. When off, the app works on the default branch only: no branch picker, comparison or reassignment.", group: "features" },
  { key: "voice_ordering", label: "Voice Ordering", description: "Voice note orders with AI transcription, in POS.", group: "features" },
  { key: "talabat_receipts", label: "Talabat Receipts", description: "Receipt processing for Talabat and other delivery companies, in POS.", group: "features" },
  { key: "localization", label: "Multi-Language & Arabic Localization", description: "Closes the Numeral Preferences tab in Admin. The language switch stays available.", group: "features" },
];

// Child module → parent module: closing the parent closes the child too.
export const MODULE_PARENT = Object.fromEntries(MODULES.filter((m) => m.parent).map((m) => [m.key, m.parent]));

// Switches that only hide a top-bar link (their page and its tabs stay open).
export const NAV_ONLY_MODULES = MODULES.filter((m) => m.navOnly).map((m) => m.key);

export const moduleLabel = (key) => MODULES.find((m) => m.key === key)?.label || key;

// Admin panel tab id → module key. Tabs not listed become their own module.
export const TAB_MODULE_MAP = {
  companies: "branches",
  printer: "branches",
  restaurant: "restaurant_info",
  timezone: "restaurant_info",
  "vendor-support": "vendor-support",
  "support-customization": "support_customization",
  "language-preference": "localization",
  email: "email_integration",
  "sms-settings": "whatsapp_sms",
  users: "users",
  roles: "users",
  cashback: "cashback",
  "cashback-rules": "cashback",
  "cashback-approvals": "cashback",
  "cashback-history": "cashback",
  "cashback-report": "cashback",
  "cashback-rule-history": "cashback",
  "reg-levels": "registrations",
  registrations: "registrations",
  loyalty: "rewards",
  milestones: "rewards",
  categories: "rewards",
  rewards: "rewards",
  redemptions: "rewards",
  preparation: "preparation",
  "unit-conversions": "inventory",
  "inventory-compliance": "inventory",
  kds: "kds",
  "social-connections": "marketing",
  tables: "tables",
  delivery: "delivery",
  "top-referrers": "referrals",
  audit: "audit",
  "branch-isolation": "multi_branch",
  "data-cleanup": "data-cleanup",
  cleanup: "data_tools",
  "data-clone": "data_tools",
  "full-export": "data_tools",
  "staff-backup": "data_tools",
};

// Tabs that can never be closed — they are the controls needed to reopen modules.
export const CORE_TABS = [
  "modules",
  "branding",
  "restaurant",
  "clear-cache",
  "users",
  "roles",
];

// Admin panel section -> module group, used when auto-detecting new tabs.
const SECTION_GROUP = {
  settings: "admin",
  systems: "admin",
  operations: "operations",
  inventory: "operations",
  purchases: "operations",
  pos: "operations",
  cashier: "operations",
  hr: "operations",
};

export function moduleForTab(tabId) {
  if (TAB_MODULE_MAP[tabId]) return TAB_MODULE_MAP[tabId];
  if (CORE_TABS.includes(tabId)) return undefined;
  // Any new tab that isn't mapped yet becomes its own module automatically.
  return tabId;
}

// Safety net: a new Admin tab nobody has mapped yet still gets its own switch.
export function autoModulesFromTabs(tabs = []) {
  const registered = new Set(MODULES.map((m) => m.key));
  const seen = new Set();
  const found = [];

  tabs.forEach((tab) => {
    const key = moduleForTab(tab.id);
    if (!key || registered.has(key) || seen.has(key)) return;
    seen.add(key);
    found.push({
      key,
      label: tab.label,
      description: `Auto-detected feature from the ${tab.label} screen.`,
      group: SECTION_GROUP[tab.section] || "admin",
      auto: true,
    });
  });

  return found;
}

// Full module list = registered modules + anything newly auto-detected.
export function resolveModules(tabs = []) {
  return [...MODULES, ...autoModulesFromTabs(tabs)];
}