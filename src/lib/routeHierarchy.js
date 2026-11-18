// One source of truth for where every screen sits in the app:
// top-bar menu group › parent screen › screen. The path bar builds every
// module's path from this; pages only add what is inside them (tabs, records).
export const NAV_GROUPS = {
  operations: "Operations",
  analytics: "Analytics",
};

// label: name in the path · group: top-bar menu it is listed in ·
// parent: screen it lives under · hidden: reachable, but not listed in its menu.
export const ROUTE_TREE = {
  MyProfile: { label: "My Profile" },
  Rewards: { label: "Rewards", parent: "MyProfile" },
  OrderHistory: { label: "Order History", parent: "MyProfile" },
  ReferralLeaderboard: { label: "Referral Leaderboard", parent: "MyProfile" },
  ReferralTree: { label: "Referral Tree", parent: "MyProfile" },
  LoyaltyProgramInfo: { label: "Loyalty Program", parent: "MyProfile" },

  Catering: { label: "Catering" },
  CateringPortal: { label: "Catering Portal" },
  MyCustody: { label: "My Custody" },

  KitchenDisplay: { label: "Kitchen Display", group: "operations" },
  DeliveryPortal: { label: "Delivery Portal", group: "operations" },
  DeliveryDriverDashboard: { label: "My Deliveries", parent: "DeliveryPortal" },
  EmployeeAttendance: { label: "Attendance", group: "operations" },
  OperationalMeetings: { label: "Operational Meetings", group: "operations" },
  Approvals: { label: "Approvals", group: "operations" },
  CRM: { label: "CRM", group: "operations" },
  Manufacturing: { label: "Manufacturing", group: "operations" },
  Butchery: { label: "Butchery", group: "operations" },
  Cashier: { label: "Cashier", group: "operations" },
  Finance: { label: "Finance", group: "operations" },
  AssetsResources: { label: "Assets and Resources", group: "operations" },
  MenuManagement: { label: "Menu Management", group: "operations" },
  InventoryHub: { label: "Inventory", group: "operations" },
  InventoryManagement: { label: "Inventory Items", parent: "InventoryHub" },
  SellingPriority: { label: "Selling Priority", parent: "InventoryHub" },
  ExpiryReports: { label: "Expiry Reports", parent: "InventoryHub" },
  PurchasesHub: { label: "Purchases", group: "operations" },
  Purchases: { label: "Purchase Records", parent: "PurchasesHub" },
  SupplierHub: { label: "Suppliers", parent: "PurchasesHub" },
  HRHub: { label: "HR", group: "operations" },
  KitchenBarManual: { label: "Kitchen & Bar Manual", group: "operations" },
  POS: { label: "POS", group: "operations", hidden: true },
  CaptainPOS: { label: "Captain POS", group: "operations", hidden: true },
  CallCenterPOS: { label: "Call Center POS", group: "operations", hidden: true },

  ExecutiveDashboard: { label: "Executive Dashboard", group: "analytics" },
  ComparativeBranchReport: { label: "Branch Comparison", parent: "ExecutiveDashboard" },
  Sales: { label: "POS / Counter Sales", group: "analytics" },
  CashbackHistory: { label: "Cashback History", group: "analytics" },
  ClientAnalytics: { label: "Client Analytics", group: "analytics" },
  ManufacturingAnalytics: { label: "Manufacturing Analytics", group: "analytics" },
  ButcheryAnalytics: { label: "Butchery Analytics", group: "analytics", hidden: true },
  MenuEngineering: { label: "Menu Engineering", group: "analytics", hidden: true },

  SupportBot: { label: "Help" },
  SystemManual: { label: "User Manual", parent: "SupportBot" },
  VeraKit360Manual: { label: "Module Manual", parent: "SupportBot" },

  Admin: { label: "Admin" },
  StaffDataBackup: { label: "Staff Data Backup", parent: "Admin" },
  BulkDeleteTestData: { label: "Delete Test Data", parent: "Admin" },
  GoLiveCleanup: { label: "Go Live Cleanup", parent: "Admin" },
  PermissionCopyCheck: { label: "Permission Check", parent: "Admin" },
  AppMarketingBrochure: { label: "Marketing Brochure", parent: "Admin" },
};

const KEYS = Object.keys(ROUTE_TREE);

// "/InventoryHub" → "InventoryHub" (case-insensitive, like the router).
export function pageNameOf(pathname) {
  const seg = pathname.replace(/^\//, "").split("/")[0];
  return KEYS.find((k) => k.toLowerCase() === seg.toLowerCase()) || seg || "Home";
}

export const routeLabel = (page) =>
  ROUTE_TREE[page]?.label || page.replace(/([a-z])([A-Z])/g, "$1 $2");

const pageLink = (page) => ({ label: routeLabel(page), url: `/${page}` });

// Screens that live under a screen (only the ones this user can open).
export const childPages = (page, canOpen) =>
  KEYS.filter((k) => ROUTE_TREE[k].parent === page && canOpen(k)).map(pageLink);

const groupPages = (group, canOpen) =>
  KEYS.filter((k) => ROUTE_TREE[k].group === group && !ROUTE_TREE[k].hidden && canOpen(k)).map(pageLink);

// Everything above a screen: its menu group, then its parent screens.
export function ancestorSegments(page, canOpen) {
  const parents = [];
  for (let p = ROUTE_TREE[page]?.parent; p && parents.length < 5; p = ROUTE_TREE[p]?.parent) parents.unshift(p);
  const group = ROUTE_TREE[parents[0] || page]?.group;
  return [
    ...(group ? [{ label: NAV_GROUPS[group], children: groupPages(group, canOpen) }] : []),
    ...parents.map((p) => ({ ...pageLink(p), children: childPages(p, canOpen) })),
  ];
}

// Full path of the current location. `reported` is what the page said is
// inside it (starting with the page itself); pages that report nothing show
// just their own name.
export function buildTrail({ page, pathname, reported, canOpen }) {
  const [own, ...inner] = reported?.length ? reported : [{ label: routeLabel(page), url: pathname }];
  const subPages = childPages(page, canOpen).filter((c) => !own.children?.some((x) => x.url === c.url));
  const children = [...(own.children || []), ...subPages];
  return [...ancestorSegments(page, canOpen), { ...own, children }, ...inner];
}

export const trailLabel = (segments) => segments.map((s) => s.label).join(" › ");