import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePermissionsSync } from "./usePermissionsSync";
import { useAccessFreshness } from "./useAccessFreshness";
import { useAppOpenSelfSync } from "./useAppOpenSelfSync";
import isAdminUser from "@/components/permissions/isAdminUser";
import resolveEffectivePermissions, { resolveAssignedPermissions } from "./resolveEffectivePermissions";

const PermissionsContext = createContext(null);

/** Live Role catalog — the single source of truth for what a role grants. */
export const ROLES_CATALOG_KEY = ["rolesCatalog"];

export function PermissionsProvider({ children, sync = true }) {
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 15_000
  });

  // The user's own row: identity, role key and sparse overrides only.
  const { data: permissionRow, isLoading: isLoadingRow } = useQuery({
    queryKey: ["userPermissions", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const rows = await base44.entities.UserPermissions.filter({ user_email: currentUser.email });
      return rows[0] || null;
    },
    enabled: !!currentUser?.email
  });

  // Read live, never snapshotted: a role edit changes access for everyone on it.
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ROLES_CATALOG_KEY,
    queryFn: () => base44.entities.Role.list(),
    enabled: !!currentUser?.email
  });

  const roleRecord = useMemo(() => (permissionRow?.role
    ? roles.find((r) => r.role_key === permissionRow.role && r.is_active !== false) || null
    : null), [permissionRow, roles]);

  const permissions = useMemo(() => {
    if (!currentUser) return null;
    return resolveEffectivePermissions({ row: permissionRow, roleRecord, currentUser });
  }, [permissionRow, roleRecord, currentUser]);

  // Roles tab + per-user overrides only, no admin shortcut — what the requisition flow's server gates use.
  const assigned = useMemo(() => (currentUser ? resolveAssignedPermissions({ row: permissionRow, roleRecord }) : null),
    [permissionRow, roleRecord, currentUser]);

  // Fast path: realtime pickup of permission-row AND role-definition changes.
  // sync={false} (the "/" home-page check) reads access without starting
  // these; the app's own provider on the next screen does.
  usePermissionsSync(sync ? currentUser?.email : null);
  // Fallback path: guarantees eventual consistency when realtime is unavailable.
  useAccessFreshness(sync ? currentUser?.email : null);
  // Drift self-heal on every app open, independent of sign-in events.
  useAppOpenSelfSync(sync ? currentUser : null);

  const isLoginDisabled = !!(currentUser && permissionRow?.login_disabled === true && currentUser?.perm_is_safety_valve !== true);

  useEffect(() => {
    if (!isLoginDisabled) return;
    base44.functions.invoke("syncPermissionCopy", { trigger: "sign_in", user_id: currentUser.id })
      .catch(() => {})
      .finally(() => base44.auth.logout(window.location.origin + "/"));
  }, [isLoginDisabled, currentUser?.id]);

  const isLoadingAccess = isLoadingUser || isLoadingRow || isLoadingRoles;

  if (isLoginDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-xl border bg-card text-card-foreground p-6 text-center space-y-2 shadow-sm">
          <h2 className="text-lg font-semibold">Account disabled</h2>
          <p className="text-sm text-muted-foreground">This account is inactive and cannot sign in. Signing you out…</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionsContext.Provider value={{ permissions, assigned, currentUser, isLoadingAccess, roleRecord }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function useOptionalPermissions() {
  return useContext(PermissionsContext);
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error("usePermissions must be used within PermissionsProvider");
  return context;
}

export function useIsAdmin() {
  const { currentUser, permissions } = usePermissions();
  return isAdminUser(currentUser, permissions);
}

export function useHasPermission(permission) {
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  return isAdmin || (permissions?.[permission] ?? false);
}

/** Returns true if the user has ANY of the given permissions */
export function useHasAnyPermission(permissionKeys) {
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  if (isAdmin) return true;
  if (!permissions) return false;
  return permissionKeys.some(k => permissions[k]);
}