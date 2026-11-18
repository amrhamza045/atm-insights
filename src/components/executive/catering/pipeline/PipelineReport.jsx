import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import SplitCard from "@/components/executive/kit/SplitCard";
import CancellationList from "./CancellationList";
import PipelineAhead from "./PipelineAhead";
import OverdueEvents from "./OverdueEvents";

const KPIS = ["new_enquiries", "won_events", "booking_conversion", "won_value", "cancellations", "cancelled_value"];
const BY_TYPE = {
  columns: [["new_enquiries", "Enquiries", "number"], ["won_events", "Booked", "number"], ["booking_conversion", "Conversion", "percent"], ["won_value", "Value booked", "money"]],
  info: { calculation: "The period's new enquiries by event type: how many were entered, how many are now booked, the share booked and their quote totals.", source: "Catering › events of the selected branches, by the day each was entered." },
  empty: "No new enquiries.",
};
const OUTCOMES = {
  title: "What became of the enquiries",
  info: {
    calculation: "The period's new enquiries by where they stand today: booked (confirmed, in progress or delivered), still open (enquiry, quoted or awaiting a deposit) or cancelled, with their quote totals.",
    source: "Catering › events of the selected branches, by the day each was entered.",
  },
  tones: { won: "bg-navy", open: "bg-gold", cancelled: "bg-danger-500" },
  empty: "No new enquiries.",
};

// Bookings & Pipeline: the period's enquiries and cancellations against the
// comparison, then the work and pipeline ahead as of today.
export default function PipelineReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("pipeline", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, vs = d.comparison.label.toLowerCase();
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)}</span></p>
      {!d.has_activity && <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">No enquiries were entered and no events were cancelled in this period.</p>}
      <OverdueEvents overdue={d.overdue} currency={cur} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={d.current[m]} previous={d.previous?.[m]} compareLabel={vs} missing="Nothing in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`New enquiries by ${d.unit}`} info={{ metric: "new_enquiries" }}>
          <TrendChart format="number" data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...OUTCOMES} parts={d.outcomes} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SegmentTable title="By event type" rows={d.by_event_type} currency={cur} {...BY_TYPE} />
        <CancellationList rows={d.cancelled} penalties={d.current.penalties_kept} currency={cur} />
      </div>
      <PipelineAhead data={d} currency={cur} />
    </div>
  );
}