import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import CommentsList from "./CommentsList";
import { KPIS, RATING_CARD, GROUP_TABLE } from "./feedbackConfig";

// Client Feedback: how clients rated the period's delivered events and what they said.
export default function FeedbackReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("feedback", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, vs = d.comparison.label.toLowerCase();
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)}</span></p>
      {!d.has_activity && <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">No events were delivered in this period.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={d.current[m]} previous={d.previous?.[m]} compareLabel={vs} missing="No events in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Average rating by ${d.unit}`} info={{ metric: "client_rating" }}>
          <TrendChart format="rating" data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...RATING_CARD} parts={d.ratings} currency={cur} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <SegmentTable title="By package" rows={d.by_package} currency={cur} {...GROUP_TABLE} />
        <SegmentTable title="By event type" rows={d.by_event_type} currency={cur} {...GROUP_TABLE} />
        <SegmentTable title="By venue" rows={d.by_venue} currency={cur} {...GROUP_TABLE} />
      </div>
      <CommentsList comments={d.comments} />
    </div>
  );
}