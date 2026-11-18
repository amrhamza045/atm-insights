import { ALL_APPROVAL_KEYS } from "@/components/approvals/approvalPermissions";

// Staff-only routes and the existing permission keys (any one) that grant them.
// Keys come from the same Role + per-user override pool used by the navigation.
// Routes not listed here are not permission-gated (customer / shared screens).
export const ROUTE_PERMISSION_MAP = {
  POS: ["pos_view", "pos_access", "pos_call_center", "pos_captain"],
  CaptainPOS: ["pos_view", "pos_access", "pos_captain"],
  CallCenterPOS: ["pos_view", "pos_access", "pos_call_center"],
  Cashier: ["cashier_view"],
  KitchenDisplay: ["kds_view", "kds_bar_view"],
  DeliveryPortal: ["delivery_view"],
  InventoryHub: ["inventory_view", "inventory_edit", "inventory_manage"],
  InventoryManagement: ["inventory_view", "inventory_edit", "inventory_manage"],
  SellingPriority: ["inventory_view", "inventory_edit", "inventory_manage", "menu_edit", "selling_priority_manage"],
  ExpiryReports: ["expiry_manage", "inventory_view", "inventory_edit"],
  PurchasesHub: ["purchase_view", "purchase_edit", "purchases_view"],
  Purchases: ["purchase_view", "purchase_edit"],
  SupplierHub: ["purchase_view", "purchase_edit"],
  Manufacturing: ["manufacturing_view", "manufacturing_edit"],
  ManufacturingAnalytics: ["manufacturing_view", "manufacturing_edit"],
  Butchery: ["butchery_view", "butchery_edit"],
  ButcheryAnalytics: ["butchery_view", "butchery_edit"],
  Catering: ["catering_view", "catering_edit", "catering_approve", "catering_finance"],
  // Same gate the screen had as a Catering tab.
  AssetsResources: ["catering_view"],
  MenuManagement: ["menu_view", "menu_create", "menu_edit", "menu_delete"],
  MenuEngineering: ["menu_view", "menu_edit", "analytics_view"],
  CRM: ["clients_view", "clients_edit", "crm_full_view"],
  ClientAnalytics: ["clients_view", "analytics_view"],
  Sales: ["sales_view"],
  Finance: ["financial_view"],
  PettyCashCustody: ["custody_view", "custody_manage", "custody_approve", "financial_view", "finance_edit"],
  Expenses: ["expenses_view", "expenses_edit", "expenses_config", "expense_approve", "financial_view", "finance_edit"],
  ExecutiveDashboard: ["analytics_view", "financial_view"],
  ComparativeBranchReport: ["analytics_view", "financial_view"],
  Approvals: ALL_APPROVAL_KEYS,
  HRHub: ["hr_view_all", "hr_edit", "hr_attendance_approve"],
  OperationalMeetings: ["hr_view_all", "hr_edit"],
  StaffDataBackup: ["admin_systems"],
  BulkDeleteTestData: ["admin_systems"],
  GoLiveCleanup: ["admin_systems"],
  // support_customization opens Admin with just its Support Customization tab.
  Admin: ["admin_settings", "admin_operations", "admin_systems", "support_customization"],
  PermissionCopyCheck: ["users_manage"],
  // Same people its menu link is shown to.
  CashbackHistory: ["analytics_view", "financial_view", "rewards_manage"],
  DeliveryDriverDashboard: ["delivery_view"],
};

export function permissionsForRoute(pageName) {
  return ROUTE_PERMISSION_MAP[pageName];
}