import { Badge } from "@/components/ui/badge";
import { fmtValue } from "@/components/executive/kit/formatters";
import { statusMeta } from "@/components/executive/catering/lossAnalysisLogic";

// One delivered event in the Loss Analysis picker.
export default function LossEventRow({ event: e, selected, onSelect, currency }) {
  const meta = statusMeta[e.status] || statusMeta.insufficient_data;
  const below = e.status === "loss" || e.status === "underperforming";
  return (
    <button type="button" onClick={() => onSelect(e.id)} aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? "border-gold bg-cream" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy" dir="auto">{e.name}</p>
          <p className="truncate text-[11px] text-slate-400" dir="auto">{e.date} · {e.package_name}</p>
        </div>
        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
      </div>
      {e.status === "insufficient_data"
        ? <p className="mt-2 rounded-lg bg-warning-50 px-2.5 py-1.5 text-xs text-warning-800">Missing {e.missing} records</p>
        : <p className="mt-2 text-xs tabular-nums text-slate-600">Margin {fmtValue(e.margin_pct, "percent")} against a {fmtValue(e.target_pct, "percent")} target{below ? ` · ${fmtValue(e.shortfall, "money", currency)} short` : ""}</p>}
    </button>
  );
}