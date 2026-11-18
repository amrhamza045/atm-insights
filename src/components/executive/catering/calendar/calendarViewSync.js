// Pure logic mapping the shared filter bar's date selection onto the calendar's
// focus window and view mode. The filter bar stays the single source of truth for
// WHICH events appear — this only decides what the calendar is looking at.

export const VIEW_MODES = ["year", "quarter", "month", "week", "day"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value) {
  const s = String(value || "").slice(0, 10);
  if (!ISO.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Granularities that map cleanly onto a calendar layout; 'custom' does not, so the
// calendar keeps whatever view the user picked and just centers on the range.
export function viewModeForGranularity(granularity) {
  if (granularity === "day") return "day";
  if (granularity === "week") return "week";
  if (granularity === "month") return "month";
  if (granularity === "year") return "year";
  return null;
}

// Returns { focusDate, viewMode } given the filter state and the user's current view.
export function resolveCalendarView({ dateActive, dateRange, granularity, userViewMode }) {
  if (!dateActive) return { focusDate: new Date(), viewMode: userViewMode };
  const mapped = viewModeForGranularity(granularity);
  const focusDate = parseIsoDate(dateRange?.from) || new Date();
  return { focusDate, viewMode: mapped || userViewMode };
}