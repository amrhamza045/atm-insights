import { format, parseISO } from "date-fns";

// The dashboard's standard periods and comparisons. The server resolves the
// actual dates on the company calendar; these are the names and labels.
export const PERIODS = [
  { value: "mtd", label: "MTD", title: "Month to date" },
  { value: "last_month", label: "Last month", title: "Last full month" },
  { value: "qtd", label: "QTD", title: "Quarter to date" },
  { value: "ytd", label: "YTD", title: "Year to date" },
  { value: "12m", label: "12M", title: "Last 12 months" },
];
export const COMPARISONS = [
  { value: "previous", label: "Previous period" },
  { value: "last_year", label: "Same period last year" },
  { value: "budget", label: "Budget" },
];
export const DEFAULT_PERIOD = "mtd";
export const DEFAULT_COMPARE = "previous";

// "1 Nov – 9 Nov 2026" for an inclusive { from, to } range.
export function rangeLabel(range) {
  if (!range?.from) return "";
  const to = format(parseISO(range.to), "d MMM yyyy");
  if (range.from === range.to) return to;
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${format(parseISO(range.from), sameYear ? "d MMM" : "d MMM yyyy")} – ${to}`;
}

// Axis label of one trend point: a day ("9 Nov") or a month ("Nov 26").
export const bucketLabel = (from, unit) => format(parseISO(from), unit === "day" ? "d MMM" : "MMM yy");