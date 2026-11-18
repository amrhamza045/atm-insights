import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";

/**
 * Catering discount management is entitlement-based, not role-name based:
 * app administrators, plus anyone whose resolved permissions grant catering
 * finance or catering editing. Works for any custom role holding those flags.
 */
export function useCateringDiscountAccess() {
  const { currentUser: user, permissions } = usePermissions();
  const isOwner = useIsAdmin();
  const canManage = !!(permissions?.catering_finance || permissions?.catering_edit);
  return { canManageDiscounts: isOwner || canManage, user };
}