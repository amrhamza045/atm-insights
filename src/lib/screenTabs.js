import { CATERING_GROUPS } from "@/components/catering/cateringTabs";
import { REPORT_PAGES } from "@/components/executive/reportCatalog";
import { FINANCE_WORKSPACE_GROUPS } from "@/components/finance/financeWorkspaceGroups";
import { CORE_TABS, moduleForTab } from "@/lib/moduleRegistry";

// Every screen with tabs, so Admin › Modules can open or close each tab for
// everyone. screen: route name · module: the switch that owns its tabs ·
// tab.module: another switch closes that tab · section: sub-heading in the
// list · stations: one more tab per active preparation area (key = area key).

const FINANCE_LABELS = {
  accounts: "Chart of accounts", mapping: "Mapping Accounts", automatic: "Automatic posting", opening: "Opening balances", tax_rules: "Tax rules",
  vat_settings: "VAT account mappings", variance_alerts: "Branch alert settings", controls: "Company controls", manual: "Finance manual",
  statements: "Financial statements", journals: "Journal ledger", proposals: "Pending review", legacy: "Historical reconstruction",
  vat: "VAT reconciliation", einvoices: "E-invoice status", tax_system: "Tax details & returns", integrity: "Ledger reconciliation",
  transaction_audit: "Transaction audit & recovery", audit: "Finance audit history", health: "Financial health check", dashboard: "Financial dashboard", comparison: "Entity comparisons", channels: "Channel profitability",
  recipe_changes: "Recipe cost changes", planning: "Budget & forecast", company_definition: "Legal company Definition",
};

const list = (pairs, extra = {}) => pairs.map(([key, label]) => ({ key, label, ...(extra[key] || {}) }));

export const SCREEN_TABS = [
  { screen: "Catering", label: "Catering", module: "catering",
    tabs: CATERING_GROUPS.flatMap((g) => g.tabs.map((t) => ({ key: t.key, label: t.label, section: g.label }))) },
  { screen: "KitchenDisplay", label: "Kitchen Display", module: "kds", stations: true,
    tabs: list([["chef_board", "Head Chef Production Board"]]) },
  { screen: "DeliveryPortal", label: "Delivery Portal", module: "delivery",
    tabs: list([["orders", "All Orders"], ["my-deliveries", "My Deliveries"], ["dashboard", "Dashboard"], ["performance", "Performance"], ["chat", "Chat"]]) },
  { screen: "EmployeeAttendance", label: "Attendance", module: "hr_attendance",
    tabs: list([["face", "Face Scan"], ["location", "Location"], ["hr", "HR Confirm"]], {
      face: { note: "Needed for self sign-in" }, location: { note: "Needed for self sign-in" } }) },
  { screen: "Approvals", label: "Approvals", module: "approvals",
    tabs: list([["pending", "Pending"], ["recent", "Recent (7 days)"]]) },
  { screen: "CRM", label: "CRM", module: "crm",
    tabs: list([["clients", "Clients"], ["leads", "Leads"], ["followups", "Follow-ups"], ["referrals", "Referrals"], ["campaigns", "Campaigns"]], {
      campaigns: { module: "marketing" } }) },
  { screen: "Manufacturing", label: "Manufacturing", module: "manufacturing",
    tabs: list([["recipes", "Recipes"], ["orders", "Production Orders"]]) },
  { screen: "ManufacturingAnalytics", label: "Manufacturing Analytics", module: "manufacturing_analytics",
    tabs: list([["overview", "Overview"], ["sourcing", "Sourcing Comparison"]]) },
  { screen: "Butchery", label: "Butchery", module: "butchery",
    tabs: list([["suppliers", "Suppliers"], ["animals", "Animals"], ["batches", "Batches"], ["slaughter", "Slaughter"], ["breakdown", "Breakdown"], ["raw_materials", "Raw Materials"], ["rework", "Rework"], ["traceability", "Traceability"], ["reports", "Reports"], ["expenses", "Expenses"]]) },
  { screen: "Cashier", label: "Cashier", module: "cashier",
    tabs: list([["orders", "Orders"], ["solditems", "Sold Items"], ["delivery", "Delivery Orders"], ["returns", "Returns"], ["pending", "Pending Approvals"], ["reports", "Reports"], ["sessions", "Sessions"], ["deposits", "Deposits"], ["expenses", "Expenses"], ["purchases", "Purchases"], ["audit", "Audit Log"], ["order-audit", "Order Audit"]]) },
  { screen: "Finance", label: "Finance", module: "financial",
    tabs: FINANCE_WORKSPACE_GROUPS.flatMap((g) => g.sections.map((id) => ({ key: id, label: FINANCE_LABELS[id] || id, section: g.title }))) },
  { screen: "PettyCashCustody", label: "Petty Cash & Custody", module: "petty_cash_custody",
    tabs: list([["balances", "Balances & Ledger"], ["requests", "Requests & Settlements"], ["configuration", "Configuration"]]) },
  { screen: "Expenses", label: "Expenses", module: "expenses_module",
    tabs: list([["disbursements", "Disbursements & Vendor Payments"], ["approvals", "Pending Approvals"], ["configuration", "Expense Types & Accounts"]]) },
  { screen: "InventoryHub", label: "Inventory", module: "inventory",
    tabs: list([["inventory", "Inventory"], ["cost-analysis", "Cost Analysis"], ["waste", "Waste"], ["expiry", "Expiry"], ["kitchen-custody", "Kitchen Custody"], ["stock-admin", "Stock Admin"], ["inventory-forecast", "Forecast"]], {
      "cost-analysis": { module: "food_cost" }, expiry: { module: "expiry" } }) },
  { screen: "InventoryManagement", label: "Inventory Items", module: "inventory",
    tabs: list([["items", "Items"], ["forecasting", "Forecasting"], ["draft-pos", "Draft POs"], ["categories", "Categories"], ["storage", "Storage Locations"], ["requested-items", "Requested Items"]]) },
  { screen: "PurchasesHub", label: "Purchases", module: "purchases",
    tabs: list([["recommended-cart", "Recommended Cart"], ["kitchen-requests", "Kitchen Requests"], ["purchase-orders", "Purchase Orders"], ["invoices", "Purchase Invoices"], ["avg-prices", "Average Prices"], ["price-advisory", "Price Advisory"], ["supplier-reliability", "Reliability"], ["suppliers", "Suppliers"], ["po-advisory", "PO Advisory"]], {
      "price-advisory": { module: "suppliers" }, "supplier-reliability": { module: "suppliers" }, suppliers: { module: "suppliers" } }) },
  { screen: "SupplierHub", label: "Supplier page", module: "suppliers",
    tabs: list([["orders", "Orders"], ["items", "Items"], ["info", "Info"], ["reviews", "Reviews"]]) },
  { screen: "HRHub", label: "HR & Payroll", module: "hr_employees",
    tabs: list([["hr-employees", "Employees"], ["hr-departments", "Departments & Roles"], ["hr-attendance", "Attendance Review"], ["hr-policy", "Attendance Policy"], ["hr-dashboard-live", "Live Dashboard"], ["hr-summary", "Summary"], ["hr-shifts", "Shifts"], ["hr-penalties", "Penalties"], ["hr-discipline", "Disciplinary"], ["hr-meetings", "Meetings"], ["hr-borrowings", "Borrowings"], ["hr-borrowing-policy", "Advance Policy"], ["hr-payroll", "Payroll"], ["hr-dashboard", "Payroll Dashboard"], ["hr-location", "Restaurant Location"]], {
      "hr-attendance": { module: "hr_attendance" }, "hr-policy": { module: "hr_attendance" }, "hr-dashboard-live": { module: "hr_attendance" }, "hr-summary": { module: "hr_attendance" }, "hr-location": { module: "hr_attendance" },
      "hr-shifts": { module: "hr_shifts" },
      "hr-penalties": { module: "hr_payroll" }, "hr-borrowings": { module: "hr_payroll" }, "hr-borrowing-policy": { module: "hr_payroll" }, "hr-payroll": { module: "hr_payroll" }, "hr-dashboard": { module: "hr_payroll" } }) },
  { screen: "KitchenBarManual", label: "Kitchen & Bar Manual", module: "kitchen_manual", stations: true,
    tabs: list([["manual", "Operations Manual"]]) },
  { screen: "MenuManagement", label: "Menu Management", module: "menu",
    tabs: list([["items", "Menu Items"], ["missing-recipe", "Missing Recipe Items"], ["food-cost", "Food Cost Analysis"], ["ai-insights", "AI Insights"], ["sections", "Sections"], ["categories", "Categories"], ["options", "Options"]], {
      "food-cost": { module: "food_cost" } }) },
  // Each report follows the module whose data it shows (see reportCatalog.js).
  { screen: "ExecutiveDashboard", label: "Executive Dashboard", module: "executive_dashboard",
    tabs: REPORT_PAGES.flatMap((p) => p.reports.map((r) => ({ key: r.value, label: r.label, section: p.label, module: r.module }))) },
  { screen: "Sales", label: "POS / Counter Sales", module: "sales_reporting",
    tabs: list([["all", "All Sales"], ["monthly-report", "Monthly Report"], ["fnb", "F&B Analytics"], ["direct", "Direct"], ["delivery-companies", "Delivery Companies"], ["daily-report", "Daily Report"], ["discount-audit", "Discount Audit"], ["item-analysis", "Item Analysis"]]) },
  { screen: "MenuEngineering", label: "Menu Engineering", module: "menu_profitability",
    tabs: list([["matrix", "BCG Matrix"], ["items", "Item Analysis"], ["pricing", "Pricing Tools"], ["categories", "Category Performance"]]) },
  { screen: "ButcheryAnalytics", label: "Butchery Analytics", module: "butchery_analytics",
    tabs: list([["overview", "Overview"], ["sourcing", "Sourcing Comparison"]]) },
  { screen: "SupportBot", label: "Help", module: "ai_assistant",
    tabs: list([["assistant", "AI Assistant"], ["manual", "Module Manual"], ["user-manual", "User Manual"], ["support", "Support"]], {
      manual: { module: "documentation" }, "user-manual": { module: "documentation" } }) },
  { screen: "MyProfile", label: "My Profile", module: "my_profile",
    tabs: list([["profile", "My Profile"], ["rewards", "Rewards"], ["partnership", "Partnership"], ["wallet", "Wallet"], ["referrals", "My Referrals"], ["tierProgress", "Tier Progress"], ["level", "Registration Level"], ["addresses", "Addresses"], ["settings", "Settings"], ["analytics", "Analytics"], ["history", "History"]], {
      rewards: { module: "rewards" }, tierProgress: { module: "rewards" }, referrals: { module: "referrals" },
      level: { module: "registrations" }, partnership: { module: "genmo" }, wallet: { module: "recharges" } }) },
  { screen: "Rewards", label: "Rewards", module: "rewards",
    tabs: list([["rewards", "Available Rewards"], ["history", "Redemption History"]]) },
  // Inner tabs of Admin sections.
  { screen: "AdminDelivery", label: "Admin › Delivery", module: "delivery",
    tabs: list([["companies", "Companies"], ["zones", "Zones"], ["persons", "Drivers"], ["bonus", "Bonus"]]) },
  { screen: "AdminUnitConversions", label: "Admin › Unit Conversions", module: "inventory",
    tabs: list([["unit_table", "Unit Table"], ["global", "Global Unit Pairs"], ["item", "Item-Specific Rules"], ["gaps", "Missing Conversions"], ["tester", "Live Calculator & Units"]]) },
  { screen: "AdminCashbackApprovals", label: "Admin › Cashback Approvals", module: "cashback",
    tabs: list([["approvals", "Pending Approvals"], ["pos-generation", "POS Cashback Generation"]]) },
  // Feature tabs inside other screens' sections.
  { screen: "AssetsResources", label: "Assets and Resources", module: "assets_resources",
    tabs: list([["all", "All"], ["equipment", "Equipment"], ["staffing", "Staffing"], ["logistics", "Logistics"]]) },
  { screen: "CateringDiscounts", label: "Catering › Discounts", module: "catering",
    tabs: list([["event", "By event"], ["event_type", "By event type"]]) },
  { screen: "CateringInvitations", label: "Catering › Invitations", module: "catering",
    tabs: list([["guests", "Guests"], ["mail", "Mail configuration"]]) },
  { screen: "CateringPackages", label: "Catering › Packages & Media", module: "catering",
    tabs: list([["packages", "Packages"], ["media", "Photo & Video"]]) },
  { screen: "CateringMail", label: "Catering › Mail", module: "catering",
    tabs: list([["templates", "Mail templates"], ["receipt", "Client Receipt"]]) },
  { screen: "SalesFnb", label: "POS / Counter Sales › F&B Analytics", module: "sales_reporting",
    tabs: list([["sales", "Sales"], ["items", "Items"], ["costs", "Costs"], ["operations", "Operations"], ["pl", "P&L"]]) },
  { screen: "ExecutiveDigital", label: "Executive Dashboard › Digital Commerce", module: "pos",
    tabs: list([["traffic", "Website Traffic"], ["ordering", "Online Ordering"], ["funnel", "Conversion Funnel"], ["acquisition", "Acquisition & Marketing"], ["devices", "Devices & Menu"], ["revenue", "Revenue & Competitive"]]) },
  { screen: "FinanceTax", label: "Finance › Tax details & returns", module: "financial",
    tabs: list([["lines", "Sales / purchase line taxes"], ["rules", "Configured tax rules"], ["withholding", "Withholding return"], ["payroll", "Payroll return"], ["corporate", "Corporate return"]]) },
  { screen: "FinanceMapping", label: "Finance › Mapping Accounts", module: "financial",
    tabs: list([["inventory", "Inventory lifecycle & COGS"], ["payment_methods", "Payment methods"], ["waste_reasons", "Waste reasons"], ["blueprint", "Accounting blueprint"], ["coverage", "Coverage"], ["templates", "Templates"], ["rules", "Rules & approval"], ["simulation", "Simulation"], ["recovery", "Event recovery"], ["exceptions", "Exceptions"], ["history", "Version history"]]) },
  { screen: "FinanceRecovery", label: "Finance › Mapping Accounts › Event recovery", module: "financial",
    tabs: list([["queue", "Recovery queue"], ["sources", "Sources"]]) },
];

// Stored form of a closed sub-tab: "<Screen>:<tab key>".
export const tabId = (screen, key) => `${screen}:${key}`;

const BY_SCREEN = Object.fromEntries(SCREEN_TABS.map((s) => [s.screen, s]));

// The switch that closes a tab (Admin tabs are checked by the Admin screen).
export function tabModule(screen, key) {
  const entry = BY_SCREEN[screen];
  if (!entry) return undefined;
  return entry.tabs.find((t) => t.key === key)?.module || entry.module;
}

// The sub-tabs a module's switch owns: its screens' tabs (plus one per
// preparation area on station screens) and its Admin tabs.
export function subTabsOf(moduleKey, { adminTabs = [], stations = [] } = {}) {
  const rows = [];
  SCREEN_TABS.forEach((entry) => {
    const stationTabs = entry.stations ? stations.map((a) => ({ key: a.key, label: `${a.name} station` })) : [];
    [...entry.tabs, ...stationTabs]
      .filter((t) => (t.module || entry.module) === moduleKey)
      .forEach((t) => rows.push({
        id: tabId(entry.screen, t.key),
        label: t.label,
        note: t.note,
        section: t.section ? `${entry.label} › ${t.section}` : entry.label,
      }));
  });
  adminTabs
    .filter((t) => !CORE_TABS.includes(t.id) && moduleForTab(t.id) === moduleKey)
    .forEach((t) => rows.push({ id: tabId("Admin", t.id), label: t.label, section: "Admin" }));
  return rows;
}