import { ROUTE_TREE, NAV_GROUPS, routeLabel } from "@/lib/routeHierarchy";
import { ROUTE_MODULE_MAP } from "@/lib/routeModuleMap";
import { MODULE_PARENT } from "@/lib/moduleRegistry";
import { permissionsForRoute } from "@/lib/routePermissionMap";
import { platformRoleFor } from "@/components/permissions/platformRoleRule";

// Screens a role can use as its home page (the Home Page button in the role
// editor): every screen in the route tree except redirects and one-off tools.
const NOT_HOME = ["ReferralTree", "BulkDeleteTestData", "GoLiveCleanup", "PermissionCopyCheck", "StaffDataBackup"];
export const HOME_PAGES = Object.keys(ROUTE_TREE).filter((page) => !NOT_HOME.includes(page));
export const isHomePage = (page) => HOME_PAGES.includes(page);

export const homePageLabel = (page) => {
  const parent = ROUTE_TREE[page]?.parent;
  return parent ? `${routeLabel(parent)} › ${routeLabel(page)}` : routeLabel(page);
};

// Same rule as the route guard, for a role's own preset plus the app-wide
// module closures. Admin roles skip the permission check and the role's own
// module closures, exactly like their users do.
export function roleCanOpen(role, page, globalClosed = []) {
  const isAdminRole = platformRoleFor({ roleKey: role.role_key, roleRecord: role }) === "admin";
  const closed = isAdminRole ? globalClosed : [...globalClosed, ...(role.disabled_modules || [])];
  const modules = ROUTE_MODULE_MAP[page];
  if (modules && !modules.some((k) => !closed.includes(k) && !closed.includes(MODULE_PARENT[k]))) return false;
  const keys = permissionsForRoute(page);
  return !keys || isAdminRole || keys.some((k) => role.permissions?.[k]);
}

// The home pages a role can open, grouped like the top bar.
export function homePageGroups(role, globalClosed) {
  const groups = new Map();
  HOME_PAGES.filter((page) => roleCanOpen(role, page, globalClosed)).forEach((page) => {
    let top = page;
    while (ROUTE_TREE[top]?.parent) top = ROUTE_TREE[top].parent;
    const group = NAV_GROUPS[ROUTE_TREE[top]?.group] || "General";
    groups.set(group, [...(groups.get(group) || []), { value: page, label: homePageLabel(page) }]);
  });
  return [...groups.entries()];
}