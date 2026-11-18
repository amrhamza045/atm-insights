/** Where crew are expected to clock in, and whether they actually did. */

export const LOCATION_LABELS = {
  branch: "Branch",
  event_site: "Event site",
};

export const MODE_LABELS = {
  centralized: "All at the branch",
  event_site: "All at the event site",
  hybrid: "Mixed — some at each",
  none: "No crew assigned",
};

export const locationOf = (assignment) => assignment?.check_in_location_type || "branch";

/** The event's attendance mode is simply derived from its assignments. */
export function deriveMode(assignments = []) {
  if (assignments.length === 0) return "none";
  const atSite = assignments.filter((a) => locationOf(a) === "event_site").length;
  if (atSite === 0) return "centralized";
  if (atSite === assignments.length) return "event_site";
  return "hybrid";
}

/** Metres between two GPS points. */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export const SITE_RADIUS_METERS = 300;

/**
 * For crew expected at the event site, compare their clock-in GPS with the venue pin.
 * Returns null when we cannot judge (no venue pin, or no GPS recorded).
 */
export function siteCheck({ assignment, attendanceRecord, event }) {
  if (locationOf(assignment) !== "event_site") return null;
  const vLat = Number(event?.venue_lat);
  const vLng = Number(event?.venue_lng);
  const aLat = Number(attendanceRecord?.sign_in_latitude);
  const aLng = Number(attendanceRecord?.sign_in_longitude);
  if (!vLat || !vLng || !aLat || !aLng) return null;
  const distance = distanceMeters(vLat, vLng, aLat, aLng);
  return { distance, onSite: distance <= SITE_RADIUS_METERS };
}