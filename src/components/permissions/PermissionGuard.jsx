import { usePermissions, useIsAdmin } from "./PermissionsContext";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AccessLoading from "./AccessLoading";

export default function PermissionGuard({ permission, children, fallback = null, showError = true }) {
  const { permissions, currentUser, isLoadingAccess } = usePermissions();

  const isAdmin = useIsAdmin();
  // App administrators have all permissions.
  if (isAdmin) {
    return children;
  }

  // Access not resolved yet — show a neutral placeholder. Rendering children
  // here (the old behaviour) leaked full module content before gating.
  // Only a logged-in user can still be "resolving": a guest has no permissions
  // query at all, so they must fall through to the denied state, not spin.
  if (isLoadingAccess || (currentUser && permissions === undefined)) {
    return showError ? <AccessLoading /> : null;
  }

  const hasPermission = permissions?.[permission] ?? false;

  if (!hasPermission) {
    if (fallback) return fallback;
    if (!showError) return null;

    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <h3 className="font-semibold text-red-900 mb-2">Access Denied</h3>
          <p className="text-sm text-red-700">
            You don't have permission to access this feature.
          </p>
          <p className="text-xs text-red-600 mt-2">
            Contact your administrator to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return children;
}