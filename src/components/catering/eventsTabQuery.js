import { eventDateWindow } from "./EventDateRangeSelect";

export const EVENTS_PAGE_SIZE = 10;

const SEARCH_FIELDS = [
  "event_name",
  "event_code",
  "client_name",
  "client_phone",
  "event_date",
  "start_time",
  "venue_name",
  "venue_address",
  "event_type",
  "venue_setting",
  "service_style",
  "dress_code",
  "theme",
  "status",
  "notes",
  "onsite_contact_name",
  "onsite_contact_phone",
  "special_requests.detail",
  "special_requests.category",
];

const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function resolveEventsSort(sortBy) {
  if (sortBy === "name") return "event_name";
  if (sortBy === "date_desc") return "-event_date";
  return "event_date";
}

export function buildEventsWhere({ branchId, dateRange, eventType, locationType, search }) {
  const windowRange = eventDateWindow(dateRange);
  const where = {
    branch_id: branchId,
    ...windowRange.query,
  };
  if (eventType) where.event_type = eventType;
  if (locationType === "off_site") where.location_type = "off_site";
  if (locationType === "on_site") where.location_type = { $nin: ["off_site"] };

  const term = String(search || "").trim();
  if (term) {
    const rx = escapeRegex(term);
    const clauses = SEARCH_FIELDS.map((f) => ({ [f]: { $regex: rx, $options: "i" } }));
    const slug = term.replace(/[\s-]+/g, "_");
    if (slug !== term) {
      const slugRx = escapeRegex(slug);
      clauses.push({ status: { $regex: slugRx, $options: "i" } });
      clauses.push({ location_type: { $regex: slugRx, $options: "i" } });
    }
    where.$or = clauses;
  }
  return where;
}