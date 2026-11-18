import InfoTip from "./InfoTip";
import DeltaBadge from "./DeltaBadge";
import Sparkline from "./Sparkline";
import { fmtValue } from "./formatters";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";

// One headline figure: its value, the change against the comparison (green
// better, red worse) and, when given, a small trend line across the period.
export default function KpiCard({ metric, value, previous, compareLabel, missing, spark, currency }) {
  const def = METRICS[metric];
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-1">
        <p className="truncate text-xs font-medium text-slate-500">{def.label}</p>
        <InfoTip metric={metric} />
      </div>
      <p className="truncate text-xl font-semibold tabular-nums text-navy sm:text-2xl">{fmtValue(value, def.format, currency)}</p>
      <DeltaBadge value={value} previous={previous} format={def.format} goodWhen={def.goodWhen} label={compareLabel} missing={missing} />
      {spark && spark.filter((v) => v != null).length > 1 && <Sparkline values={spark} />}
    </div>
  );
}