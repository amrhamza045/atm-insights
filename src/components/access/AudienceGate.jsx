import { Navigate } from "react-router-dom";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import AccessLoading from "@/components/permissions/AccessLoading";
import useStaffAccess from "./useStaffAccess";
import { OPEN_PAGES, PORTAL_PATH, SIGN_IN_PAGES, hasPortalAccess } from "./audience";

/**
 * Signed-in accounts that aren't staff: only their invitation pages and the
 * catering portal. Any other screen sends them to their portal (when staff gave
 * them access) or to the website.
 */
export default function AudienceGate({ pageName, children }) {
  const { currentUser } = usePermissions();
  const { isStaff, isLoading } = useStaffAccess();
  if (OPEN_PAGES.includes(pageName) || SIGN_IN_PAGES.includes(pageName)) return children;
  if (isLoading) return <AccessLoading className="min-h-[60vh]" />;
  if (isStaff) return children;
  return <Navigate to={hasPortalAccess(currentUser) ? PORTAL_PATH : "/"} replace />;
}