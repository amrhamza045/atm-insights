import { usePermissions } from "@/components/permissions/PermissionsContext";
import isAdminUser from "@/components/permissions/isAdminUser";

/**
 * Screen mirror of the Phase 3 catering data rules: central admin → everything;
 * otherwise catering_edit, and the record's branch must match the user's branch
 * (no branch on the permission record = all branches).
 */
export function useCateringEditAccess() {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = isAdminUser(currentUser, permissions);
  const canEdit = isAdmin || permissions?.catering_edit === true;
  const canEditRecord = (record) =>
    isAdmin || (canEdit && (!permissions?.branch_id || record?.branch_id === permissions.branch_id));
  // Payments / credit notes: catering_finance + the same branch check.
  const canFinanceRecord = (record) =>
    isAdmin || (permissions?.catering_finance === true && (!permissions?.branch_id || record?.branch_id === permissions.branch_id));
  return { canEdit, canEditRecord, canFinanceRecord };
}