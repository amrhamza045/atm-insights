// Number formatting for the Executive Dashboard. Money carries the Finance
// company's currency code when it is known; axes use the short form (1.2M, 350K).
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const sign = (v) => (v < 0 ? "−" : "");

export const fmtNumber = (v) => (v == null ? "—" : whole.format(v));
export const fmtMoney = (v, currency) => (v == null ? "—" : `${sign(v)}${currency ? `${currency} ` : ""}${whole.format(Math.abs(v))}`);
export const fmtPct = (v, digits = 1) => (v == null ? "—" : `${v.toFixed(digits)}%`);
export function fmtShort(v) {
  const a = Math.abs(v);
  return `${sign(v)}${a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}K` : whole.format(a)}`;
}

export const fmtRating = (v) => (v == null ? "—" : `${v.toFixed(1)} / 5`);
const tenth = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtHours = (v) => (v == null ? "—" : `${tenth.format(v)} h`);

// format: money | number | percent | rating | hours (as in metricDefinitions).
export function fmtValue(v, format, currency) {
  if (format === "money") return fmtMoney(v, currency);
  if (format === "percent") return fmtPct(v);
  if (format === "rating") return fmtRating(v);
  if (format === "hours") return fmtHours(v);
  return fmtNumber(v);
}