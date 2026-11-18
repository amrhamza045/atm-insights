import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { sourceLabel, statusMeta } from "./lossAnalysisLogic";

export default function LossOverviewStep({ event, run, quote }) {
  const meta = statusMeta[event.loss_analysis_status] || statusMeta.insufficient_data;
  const expectedPct = Number(quote?.total) > 0 ? Number(run.margin_bridge_expected_margin) / Number(quote.total) * 100 : null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Loss overview</h3><Badge variant="outline" className={meta.className}>{meta.label}</Badge></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4"><p className="text-xs text-slate-500">Expected margin</p><p className="text-2xl font-bold">{formatCurrency(run.margin_bridge_expected_margin, true)}</p><p className="text-sm text-slate-500">{expectedPct == null ? "—" : `${expectedPct.toFixed(2)}%`}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Actual margin</p><p className="text-2xl font-bold">{formatCurrency(run.margin_bridge_actual_margin, true)}</p><p className="text-sm text-slate-500">{event.actual_margin_percentage == null ? "—" : `${Number(event.actual_margin_percentage).toFixed(2)}%`}</p></Card>
      </div>
      <Card className="p-4"><p className="text-xs text-slate-500">Resolved benchmark</p><p className="font-semibold">{event.applicable_target_margin_percentage ?? "—"}% · {sourceLabel(event.applicable_target_margin_source)}</p></Card>
    </div>
  );
}