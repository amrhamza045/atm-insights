import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import Waterfall from "@/components/executive/kit/Waterfall";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import VarianceEventList from "./VarianceEventList";
import { KPIS, BRIDGE_INFO, TYPE_TABLE, GROUP_TABLE, RECIPE_TABLE } from "./costVarianceConfig";

// Cost Variance: what the period's delivered events cost against their plan.
export default function CostVarianceReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("variance", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, c = d.current, cur = d.currency, vs = d.comparison.label.toLowerCase();
  const steps = d.by_type.map((t) => ({ label: t.label, value: t.current.vs_estimate })).filter((s) => Math.abs(s.value) >= 0.5);
  const notes = [
    !d.has_activity && "No events were delivered in this period.",
    d.left_out > 0 && `${d.left_out} delivered ${d.left_out === 1 ? "event has" : "events have"} incomplete actual costs (for example missing release slips or staff clock-ins), so they're left out.`,
  ].filter(Boolean);
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)}</span></p>
      {notes.map((n) => <p key={n} role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">{n}</p>)}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={c[m]} previous={d.previous?.[m]} compareLabel={vs} missing="No events in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Cost over estimate by ${d.unit}`} info={{ metric: "cost_vs_estimate" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <ReportCard title="From planned to actual cost" subtitle={`${c.events_compared} events with complete actual costs`} info={BRIDGE_INFO}>
          {c.events_compared ? <Waterfall costs currency={cur} steps={[{ label: "Planned cost", value: c.planned_cost, total: true }, ...steps, { label: "Actual cost", value: c.actual_cost, total: true }]} />
            : <p className="py-6 text-center text-sm text-slate-500">No event has complete actual costs.</p>}
        </ReportCard>
      </div>
      <SegmentTable title="By cost type" rows={d.by_type} currency={cur} {...TYPE_TABLE} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SegmentTable title="By event type" rows={d.by_event_type} currency={cur} {...GROUP_TABLE} />
        <SegmentTable title="By package" rows={d.by_package} currency={cur} {...GROUP_TABLE} />
      </div>
      <VarianceEventList events={d.events} currency={cur} />
      <SegmentTable title="Production batches by recipe" rows={d.by_recipe} currency={cur} {...RECIPE_TABLE}
        subtitle={d.batches_skipped ? `${d.batches_skipped} batches left out: their recipe is no longer on file.` : undefined} />
    </div>
  );
}