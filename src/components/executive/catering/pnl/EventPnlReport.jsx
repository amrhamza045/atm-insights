import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import Waterfall from "@/components/executive/kit/Waterfall";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "./SegmentTable";
import EventList from "./EventList";

const KPIS = ["events_delivered", "guests_served", "event_revenue", "event_costs", "event_margin", "event_margin_pct"];

// Event P&L: delivered events at their final bills against recorded actual costs.
export default function EventPnlReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("pnl", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, c = d.current, cur = d.currency;
  const notes = [
    !d.has_activity && "No events were delivered in this period.",
    d.incomplete > 0 && `${d.incomplete} events have incomplete actual costs (for example missing staff clock-ins), so their costs may be understated.`,
    d.unbilled > 0 && `${d.unbilled} delivered events have no final bill yet and aren't counted in the money figures.`,
  ].filter(Boolean);
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {d.comparison.label.toLowerCase()}: {rangeLabel(d.comparison)}</span></p>
      {notes.map((n) => <p key={n} role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">{n}</p>)}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={c[m]} previous={d.previous?.[m]} compareLabel={d.comparison.label.toLowerCase()} missing="No events in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Event revenue by ${d.unit}`} info={{ metric: "event_revenue" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <ReportCard title="From revenue to margin" info={{ title: "From revenue to margin", calculation: "Event revenue minus each recorded cost type.", source: "Catering › delivered events." }}>
          <Waterfall currency={cur} steps={[
            { label: "Revenue", value: c.event_revenue, total: true },
            { label: "Food", value: -c.food }, { label: "Labour", value: -c.labour },
            { label: "Equipment", value: -c.equipment }, { label: "Exceptions", value: -c.exceptions },
            { label: "Margin", value: c.event_margin, total: true },
          ]} />
        </ReportCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SegmentTable title="By event type" rows={d.by_event_type} currency={cur} />
        <SegmentTable title="By package" rows={d.by_package} currency={cur} />
        <SegmentTable title="By venue type" rows={d.by_venue_type} currency={cur} />
        <SegmentTable title="By client" rows={d.by_client} currency={cur} />
      </div>
      <EventList events={d.events} currency={cur} />
    </div>
  );
}