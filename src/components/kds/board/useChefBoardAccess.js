import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";

// Editors: users with requisition_submit / catering_edit / manufacturing_edit permissions,
// or admins. No hardcoded role labels — access is strictly permission-based.
// Everyone else is read-only and limited to batches and menu items assigned to them.
export function useChefBoardAccess() {
  const isAdmin = useIsAdmin();
  const { permissions, assigned } = usePermissions();

  const access = useQuery({
    queryKey: ["chef-board-access", permissions?.user_email],
    queryFn: async () => {
      const me = await base44.auth.me();
      const employees = await base44.entities.Employee.filter({ email: me.email });
      return {
        employeeId: employees.find((e) => e.status === "active")?.id || null,
      };
    },
  });

  const hasEditFlag = !!(
    assigned?.requisition_submit ||
    permissions?.requisition_submit ||
    permissions?.catering_edit ||
    permissions?.manufacturing_edit
  );

  return {
    loading: access.isLoading,
    canEdit: isAdmin || hasEditFlag,
    employeeId: access.data?.employeeId || null,
  };
}