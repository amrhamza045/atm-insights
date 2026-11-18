import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { moduleForRoute } from "@/lib/routeModuleMap";
import { MODULE_PARENT } from "@/lib/moduleRegistry";
import { permissionsForRoute } from "@/lib/routePermissionMap";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import AccessLoading from "@/components/permissions/AccessLoading";

function LockScreen({ title, message }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
        <Lock className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{message}</p>
        <Link to="/" className="inline-block text-sm font-semibold text-slate-900 underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function ModuleRouteGuard({ pageName, children }) {
  const { isRouteOpen, isLoading, disabledModules } = useModuleAccess();
  const { permissions, isLoadingAccess } = usePermissions();
  const isAdmin = useIsAdmin();
  // Every module that lists this screen; it opens while any of them is open.
  const moduleKeys = moduleForRoute(pageName);
  const requiredKeys = permissionsForRoute(pageName);

  if (!moduleKeys && !requiredKeys) return children;
  // Wait for access state before rendering so restricted pages never flash.
  if (isLoading || isLoadingAccess) return <AccessLoading className="min-h-[60vh]" />;

  if (moduleKeys && !isRouteOpen(pageName)) {
    const closedForEveryone = moduleKeys.every((k) => disabledModules.includes(k) || disabledModules.includes(MODULE_PARENT[k]));
    return (
      <LockScreen
        title="This module is closed"
        message={closedForEveryone
          ? "This feature is closed for the whole app. An administrator can reopen it in Module Management."
          : "This feature is not included in your role. Contact an administrator to review your role's modules."}
      />
    );
  }

  if (requiredKeys && !isAdmin && !requiredKeys.some((k) => permissions?.[k])) {
    return (
      <LockScreen
        title="Access restricted"
        message="Your role doesn't include access to this page. Contact an administrator to review your permissions."
      />
    );
  }

  return children;
}