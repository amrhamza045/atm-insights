import { useModuleAccess } from "@/hooks/useModuleAccess";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { permissionsForRoute } from "@/lib/routePermissionMap";

// Same rule as the route guard: can this user open a screen? Used so the
// path bar only lists places that will actually open.
export default function useRouteAccess() {
  const { isRouteOpen } = useModuleAccess();
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  return (page) => {
    if (!isRouteOpen(page)) return false;
    const keys = permissionsForRoute(page);
    return !keys || isAdmin || keys.some((k) => permissions?.[k]);
  };
}