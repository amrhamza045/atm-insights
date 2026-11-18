import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import PeopleTable from "./PeopleTable";
import { KPIS, TYPE_CARD, ROLE_TABLE } from "./staffingConfig";

// Catering Staffing: how the period's events were staffed, what labour cost and how the staff did.
export default function StaffingReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("staffing", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, vs = d.comparison.label.toLowerCase();
  const notes = [
    !d.has_activity && "No confirmed or delivered events are dated in this period.",
    d.incomplete > 0 && `${d.incomplete} delivered events have incomplete actual costs (for example missing staff clock-ins), so labour may read low.`,
  ].filter(Boolean);
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)}</span></p>
      {notes.map((n) => <p key={n} role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">{n}</p>)}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={d.current[m]} previous={d.previous?.[m]} compareLabel={vs} missing="No events in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Labour cost by ${d.unit}`} info={{ metric: "labour_cost" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...TYPE_CARD} parts={d.types} currency={cur} />
      </div>
      <SegmentTable title="By role" rows={d.by_role} currency={cur} {...ROLE_TABLE} />
      <PeopleTable people={d.people} currency={cur} />
    </div>
  );
}