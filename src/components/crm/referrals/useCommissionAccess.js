import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";

// Referral commissions are money owed to referrers: admins and staff with
// financial access see them, the same people the commission data rules let in.
export default function useCommissionAccess() {
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  return isAdmin || !!permissions?.financial_view;
}

// Recording or changing a commission needs "Edit financial records".
export function useCommissionEditAccess() {
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  return isAdmin || !!permissions?.finance_edit;
}