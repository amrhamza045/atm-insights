import { useQuery } from "@tanstack/react-query";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { activeEmployeeQuery } from "@/components/landing/useIsHrEmployee";
import { hasStaffRole } from "./audience";

/**
 * Whether the signed-in account is staff: an admin, a staff role, or an active
 * employee (who may only clock attendance). Revoked staff never count.
 */
export default function useStaffAccess() {
  const { permissions, isLoadingAccess } = usePermissions();
  const isAdmin = useIsAdmin();
  const byRole = isAdmin || hasStaffRole(permissions);
  const checkEmployee = !isLoadingAccess && !byRole && !!permissions && !permissions.is_ex_employee;
  const employee = useQuery({ ...activeEmployeeQuery, enabled: checkEmployee });
  return {
    isLoading: !!isLoadingAccess || (checkEmployee && employee.isPending),
    isStaff: byRole || (checkEmployee && employee.data === true),
  };
}