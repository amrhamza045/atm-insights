import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MODULE_PARENT, NAV_ONLY_MODULES } from "@/lib/moduleRegistry";
import { ROUTE_MODULE_MAP } from "@/lib/routeModuleMap";
import { tabId, tabModule } from "@/lib/screenTabs";
import { useOptionalPermissions } from "@/components/permissions/PermissionsContext";
import { isSafetyValveUser } from "@/components/permissions/platformRoleRule";

// Shared query key so every component using the hook reads from the same cache
// (react-query dedupes identical keys) — no per-page refetching.
export const MODULES_QUERY_KEY = ["systemSettings", "moduleAccess"];

// The single settings record that holds module and sub-tab switches.
export async function fetchModuleSettings() {
  const rows = await base44.entities.SystemSettings.filter({ setting_key: "default" });
  return rows[0] || null;
}

export function useModuleAccess() {
  const access = useOptionalPermissions();
  // Only the safety-valve account bypasses per-user module and tab closures;
  // everyone else follows their role's modules and tabs plus their own changes
  // (platform admins resolve to none). Global closures still apply to everyone.
  const valve = isSafetyValveUser(access?.currentUser);
  const userDenied = valve ? [] : access?.permissions?.disabled_modules || [];
  const userClosedTabs = valve ? [] : access?.permissions?.disabled_tabs || [];
  const { data, isLoading } = useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: async () => {
      try {
        return await fetchModuleSettings();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  const disabledModules = Array.isArray(data?.disabled_modules)
    ? data.disabled_modules
    : [];
  const disabledTabs = Array.isArray(data?.disabled_tabs) ? data.disabled_tabs : [];

  // A module is enabled unless explicitly listed in disabled_modules.
  // Unknown/empty keys are always enabled (defaults to ON).
  // A child module is also off when its parent module is closed.
  const isModuleEnabled = (key) => {
    if (!key) return true;
    if (access?.isLoadingAccess || disabledModules.includes(key) || userDenied.includes(key)) return false;
    const parent = MODULE_PARENT[key];
    return !parent || (!disabledModules.includes(parent) && !userDenied.includes(parent));
  };

  const areAnyEnabled = (keys = []) =>
    !keys || keys.length === 0 ? true : keys.some((k) => isModuleEnabled(k));

  // A screen opens while any module that lists it is open (same rule as its menu link).
  const isRouteOpen = (page) => {
    const keys = ROUTE_MODULE_MAP[page];
    return !keys || keys.some((k) => isModuleEnabled(k));
  };

  // A sub-tab is open unless it is closed in Admin › Modules (for everyone,
  // admins included), closed for this account (by its role or a per-user
  // change in Admin › Users), or the module that owns it is closed.
  const isTabOpen = (screen, key) => {
    const id = tabId(screen, key);
    if (disabledTabs.includes(id) || userClosedTabs.includes(id)) return false;
    const owner = tabModule(screen, key);
    return !owner || NAV_ONLY_MODULES.includes(owner) || isModuleEnabled(owner);
  };

  return { isModuleEnabled, areAnyEnabled, isRouteOpen, isTabOpen, disabledModules, disabledTabs, isLoading: isLoading || !!access?.isLoadingAccess };
}