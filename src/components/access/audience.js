import { ALL_PERMISSION_KEYS } from "@/components/permissions/permissionKeys";

/**
 * Who can open which screens. Staff keep every screen their role allows; anyone
 * else sees only the website, the catering portal staff gave them, and their
 * personal invitation pages.
 */

// Opened from a personal link: any signed-in account; visitors sign in first.
export const SIGN_IN_PAGES = ["EventRsvp", "EventPass", "CateringPortal"];

// Unknown addresses keep showing "not found".
export const OPEN_PAGES = ["PageNotFound"];

export const PORTAL_PATH = "/CateringPortal";

export const hasPortalAccess = (user) => !!user?.portal_client_id;

// A staff role that grants at least one permission (customers resolve to "view_only").
export const hasStaffRole = (permissions) =>
  !!permissions && !permissions.access_denied && permissions.role !== "view_only" &&
  ALL_PERMISSION_KEYS.some((key) => permissions[key] === true);