import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { changeOf, changeText } from "./change";

// Change against the comparison: green when the figure moved the better way,
// red when it moved the worse way. Percentages change in points.
export default function DeltaBadge({ value, previous, format, goodWhen = "up", label, missing = "No comparison" }) {
  const c = changeOf(value, previous, format, goodWhen);
  if (!c) return <p className="text-[11px] text-slate-400">{missing}</p>;
  if (c.pct === null) return <p className="text-[11px] text-slate-400">New against {label}</p>;
  const Icon = c.flat ? Minus : c.diff > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = c.better === null ? "bg-slate-100 text-slate-600" : c.better ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700";
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums ${tone}`}>
        <Icon className="w-3 h-3" aria-hidden="true" />
        {changeText(c)}
        {c.better !== null && <span className="sr-only">{c.better ? " (better)" : " (worse)"}</span>}
      </span>
      <span className="truncate">vs {label}</span>
    </p>
  );
}