// Pure venue-filter logic for catering analytics.
// locationType: "all" | "on_site" | "off_site"; venueNames: string[]

export const DEFAULT_VENUE_FILTER = { locationType: "all", venueNames: [] };

export function isVenueFilterActive({ locationType, venueNames }) {
  return locationType !== "all" || venueNames.length > 0;
}

export function eventMatchesVenueFilter(event, { locationType, venueNames }) {
  if (locationType !== "all" && (event.location_type || "on_site") !== locationType) return false;
  if (venueNames.length > 0 && !venueNames.includes(event.venue_name)) return false;
  return true;
}

export function distinctVenueNames(events) {
  return [...new Set(events.map((e) => e.venue_name).filter(Boolean))].sort();
}