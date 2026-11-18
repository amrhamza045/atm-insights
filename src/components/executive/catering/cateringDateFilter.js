// Pure date-filter logic for catering analytics.
// The filter carries an optional granularity plus the selections it needs:
//   ""      -> legacy behaviour (day/month/year selects, resolved as before)
//   "day"   -> year + month + day  -> that single day
//   "week"  -> weekStart (any date) -> the ISO week (Monday–Sunday) containing it
//   "month" -> year + month        -> whole month
//   "year"  -> year                -> whole year
//   "custom"-> customFrom/customTo -> explicit inclusive window (either side may be open)
// Ranges are inclusive YYYY-MM-DD, compared against CateringEvent.event_date.

export const DEFAULT_DATE_FILTER = {
  granularity: "",
  day: "",
  month: "",
  year: "",
  weekStart: "",
  customFrom: "",
  customTo: "",
};
export const EMPTY_RANGE = { from: "", to: "" };

const OPEN_START = "0000-01-01";
const OPEN_END = "9999-12-31";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clean = (v) => {
  const s = String(v || "").slice(0, 10);
  return ISO.test(s) ? s : "";
};

// ISO week: Monday-based, inclusive 7-day window containing the given date.
export function resolveWeekRange(anchor) {
  const a = clean(anchor);
  if (!a) return EMPTY_RANGE;
  const [y, m, d] = a.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const offset = (start.getDay() + 6) % 7; // Sunday(0) -> 6
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: iso(start), to: iso(end) };
}

function resolveCalendarRange(f) {
  const year = Number(f.year);
  if (!year) return EMPTY_RANGE;

  const month = Number(f.month);
  if (!month) return { from: `${year}-01-01`, to: `${year}-12-31` };

  const lastDay = new Date(year, month, 0).getDate();
  const day = Number(f.day);
  if (!day) return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };

  const safeDay = Math.min(day, lastDay);
  const single = `${year}-${pad(month)}-${pad(safeDay)}`;
  return { from: single, to: single };
}

// Reversed inputs silently match nothing, so the custom window is swapped instead.
export function resolveCustomRange(f) {
  let from = clean(f.customFrom);
  let to = clean(f.customTo);
  if (from && to && from > to) [from, to] = [to, from];
  if (!from && !to) return EMPTY_RANGE;
  return { from: from || OPEN_START, to: to || OPEN_END };
}

export function resolveDateRange(filter = DEFAULT_DATE_FILTER) {
  const f = { ...DEFAULT_DATE_FILTER, ...(filter || {}) };

  if (f.granularity === "custom") return resolveCustomRange(f);
  if (f.granularity === "week") return resolveWeekRange(f.weekStart);
  if (f.granularity === "day") {
    if (!f.year || !f.month || !f.day) return EMPTY_RANGE;
    return resolveCalendarRange(f);
  }
  if (f.granularity === "month") return resolveCalendarRange({ ...f, day: "" });
  if (f.granularity === "year") return resolveCalendarRange({ ...f, month: "", day: "" });

  return resolveCalendarRange(f);
}

export function dateRangeLabel(range) {
  if (!isDateRangeActive(range)) return "";
  if (range.from === range.to) return range.from;
  const from = range.from === OPEN_START ? "" : range.from;
  const to = range.to === OPEN_END ? "" : range.to;
  if (!from) return `Up to ${to}`;
  if (!to) return `From ${from}`;
  return `${from} → ${to}`;
}

export function isDateRangeActive(range) {
  return !!(range && range.from && range.to);
}

export function eventMatchesDateRange(event, range) {
  if (!isDateRangeActive(range)) return true;
  const d = String(event?.event_date || "").slice(0, 10);
  if (!d) return false;
  return d >= range.from && d <= range.to;
}