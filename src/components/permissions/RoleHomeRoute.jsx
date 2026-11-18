import { Navigate } from "react-router-dom";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import useRouteAccess from "@/hooks/useRouteAccess";
import { isHomePage } from "@/lib/homePages";

// "/" for a signed-in account: the home page chosen for its role in
// Admin › Role Management (role editor), when the account can open it. No role,
// no home page, or a screen closed to them shows `children` (the website).
export default function RoleHomeRoute({ loading, children }) {
  const { roleRecord, isLoadingAccess } = usePermissions();
  const { isLoading } = useModuleAccess();
  const canOpen = useRouteAccess();
  if (isLoadingAccess || isLoading) return loading;
  const home = roleRecord?.home_page;
  return home && isHomePage(home) && canOpen(home) ? <Navigate to={`/${home}`} replace /> : children;
}