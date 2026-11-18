import { fmtPct } from "./formatters";

// How a figure moved against its comparison: the difference, the change in %
// (in points for percentages and ratings; null when the comparison is zero) and
// whether that is better (true), worse (false) or neither (null).
export function changeOf(value, previous, format, goodWhen = "up") {
  if (value == null || previous == null) return null;
  const diff = value - previous, points = format === "percent" || format === "rating";
  const pct = points ? diff : previous === 0 ? (value === 0 ? 0 : null) : (diff / Math.abs(previous)) * 100;
  const flat = pct !== null && Math.abs(pct) < 0.05;
  const better = flat || goodWhen === "none" ? null : (diff > 0) === (goodWhen === "up");
  return { diff, pct, points, flat, better };
}

// "+4.2%", "−1.5 pts" or "0"; null when the comparison is zero.
export function changeText(c) {
  if (c.flat) return "0";
  if (c.pct === null) return null;
  return `${c.pct > 0 ? "+" : "−"}${c.points ? `${Math.abs(c.pct).toFixed(1)} pts` : fmtPct(Math.abs(c.pct))}`;
}

// Text colour of a change: Rosemary green when better, red when worse.
export const changeTone = (better) => (better === null ? "text-slate-500" : better ? "text-success-700" : "text-danger-700");