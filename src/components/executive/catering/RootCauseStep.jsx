import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { rankedLines } from "./lossAnalysisLogic";

export default function RootCauseStep({ run }) {
  const lines = rankedLines(run);
  return (
    <div className="space-y-3">
      <div><h3 className="text-lg font-bold text-slate-900">Root cause ranking</h3><p className="text-sm text-slate-500">Stored factors ranked by absolute EGP impact.</p></div>
      {lines.length ? lines.map((line, index) => (
        <div key={line.key} className={`flex items-center gap-3 rounded-xl border p-3 ${index < 2 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <Badge className={index < 2 ? "bg-amber-600" : "bg-slate-500"}>#{index + 1}</Badge>
          <div className="flex-1"><p className="font-semibold text-slate-900">{line.label}</p><p className="text-xs text-slate-500">Absolute impact {formatCurrency(line.absolute_amount, true)}</p></div>
          <p className={line.delta < 0 ? "font-bold text-red-600" : "font-bold text-emerald-600"}>{line.delta > 0 ? "+" : ""}{formatCurrency(line.delta, true)}</p>
        </div>
      )) : <p className="rounded-lg border border-dashed p-4 text-sm text-slate-400">No nonzero factors.</p>}
    </div>
  );
}