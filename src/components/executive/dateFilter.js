// Shared pure duration-filter logic for executive analytics.
// The filter is three independent selections: day, month, year (all optional strings).
//   year only            -> whole year
//   year + month         -> whole month
//   year + month + day   -> that single day
//   no year              -> inactive (day/month alone can't pin a range)

export const DEFAULT_DATE_FILTER = { day: "", month: "", year: "" };
export const EMPTY_RANGE = { from: "", to: "" };

const pad = (n) => String(n).padStart(2, "0");

export function resolveDateRange(filter = DEFAULT_DATE_FILTER) {
  const f = { ...DEFAULT_DATE_FILTER, ...(filter || {}) };
  const year = Number(f.year);
  if (!year) return EMPTY_RANGE;

  const month = Number(f.month);
  if (!month) return { from: `${year}-01-01`, to: `${year}-12-31` };

  const lastDay = new Date(year, month, 0).getDate();
  const day = Number(f.day);
  if (!day) return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };

  const safeDay = Math.min(day, lastDay);
  const iso = `${year}-${pad(month)}-${pad(safeDay)}`;
  return { from: iso, to: iso };
}

export function isDateRangeActive(range) {
  return !!(range && range.from && range.to);
}

// Generic row matcher: checks any of the given date fields against the range.
export function rowMatchesRange(row, range, fields = ["created_date"]) {
  if (!isDateRangeActive(range)) return true;
  for (const field of fields) {
    const d = String(row?.[field] || "").slice(0, 10);
    if (d) return d >= range.from && d <= range.to;
  }
  return false;
}

export function filterRowsByRange(rows = [], range, fields = ["created_date"]) {
  if (!isDateRangeActive(range)) return rows;
  return rows.filter((r) => rowMatchesRange(r, range, fields));
}

// Human label for the active window, used in chart subtitles.
export function rangeLabel(range) {
  if (!isDateRangeActive(range)) return "";
  return range.from === range.to ? range.from : `${range.from} → ${range.to}`;
}