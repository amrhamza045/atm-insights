import { formatCurrency } from "@/components/utils/currencyFormatter";
import { CANONICAL_KEYS } from "./lossAnalysisLogic";

export default function MarginWaterfall({ run }) {
  const linesByKey = Object.fromEntries((run.margin_bridge_lines || []).map((line) => [line.key, line]));
  const lines = CANONICAL_KEYS.map((key) => linesByKey[key]).filter(Boolean);
  const max = Math.max(1, ...lines.map((line) => Math.abs(Number(line.delta) || 0)));
  let running = Number(run.margin_bridge_expected_margin) || 0;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-900">Factor breakdown</h3>
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <p className="font-semibold">Start · {formatCurrency(running, true)}</p>
        {lines.map((line) => { const before = running; running += Number(line.delta) || 0; return (
          <div key={line.key} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm"><span>{line.label}</span><span className={line.delta < 0 ? "font-semibold text-red-600" : line.delta > 0 ? "font-semibold text-emerald-600" : "text-slate-400"}>{line.delta > 0 ? "+" : ""}{formatCurrency(line.delta, true)}</span></div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${line.delta < 0 ? "bg-red-400" : line.delta > 0 ? "bg-emerald-400" : "bg-slate-300"}`} style={{ width: `${Math.max(2, Math.abs(line.delta) / max * 100)}%` }} /></div>
            <p className="text-xs text-slate-400">{formatCurrency(before, true)} → {formatCurrency(running, true)}</p>
          </div>
        ); })}
        <p className="border-t pt-3 font-semibold">Finish · {formatCurrency(run.margin_bridge_actual_margin, true)}</p>
      </div>
    </div>
  );
}