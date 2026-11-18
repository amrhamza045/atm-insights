import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import useStaffAccess from "./useStaffAccess";
import { PORTAL_PATH, hasPortalAccess } from "./audience";

/**
 * "/" for a signed-in customer: straight to their catering portal, attaching a
 * pending portal invitation first. Staff and everyone else see `children`.
 */
export default function PortalHomeRedirect({ loading, children }) {
  const { currentUser } = usePermissions();
  const { isStaff, isLoading } = useStaffAccess();
  const queryClient = useQueryClient();
  const customer = !isLoading && !isStaff && !!currentUser;
  const needsClaim = customer && !hasPortalAccess(currentUser);

  const claim = useQuery({
    queryKey: ["portalClaim", currentUser?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("claimPortalAccess", {});
      if (res.data?.linked) await queryClient.refetchQueries({ queryKey: ["currentUser"] });
      return res.data?.linked === true;
    },
    enabled: needsClaim,
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading || (needsClaim && claim.isPending)) return loading;
  if (customer && (hasPortalAccess(currentUser) || claim.data)) return <Navigate to={PORTAL_PATH} replace />;
  return children;
}