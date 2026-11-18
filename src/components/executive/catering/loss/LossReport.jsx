import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import Waterfall from "@/components/executive/kit/Waterfall";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import LossEvents from "./LossEvents";
import { KPIS, STATUS_CARD, BRIDGE_INFO, FACTOR_TABLE, GROUP_TABLE } from "./lossReportConfig";

// Loss Analysis: the period's delivered events against their target and quoted margins.
export default function LossReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("loss", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, vs = d.comparison.label.toLowerCase(), b = d.bridge;
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)}</span></p>
      {!d.has_activity && <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">No events were delivered in this period.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={d.current[m]} previous={d.previous?.[m]} compareLabel={vs} missing="No events in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Margin short of target by ${d.unit}`} info={{ metric: "margin_shortfall" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...STATUS_CARD} parts={d.statuses} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ReportCard title="From quoted to actual margin" subtitle={`${b.events} events with complete actual costs`} info={BRIDGE_INFO}>
          {b.events ? <Waterfall currency={cur} steps={[{ label: "Quoted margin", value: b.expected, total: true }, ...b.steps, { label: "Actual margin", value: b.actual, total: true }]} />
            : <p className="py-6 text-center text-sm text-slate-500">No event has complete actual costs.</p>}
        </ReportCard>
        <SegmentTable title="What cost margin" rows={d.factors} currency={cur} {...FACTOR_TABLE} />
        <SegmentTable title="By package" rows={d.by_package} currency={cur} {...GROUP_TABLE} />
        <SegmentTable title="By event type" rows={d.by_event_type} currency={cur} {...GROUP_TABLE} />
      </div>
      <LossEvents events={d.events} currency={cur} />
    </div>
  );
}