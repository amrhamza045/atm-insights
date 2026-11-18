import KpiCard from "@/components/executive/kit/KpiCard";
import { rangeLabel } from "@/components/executive/period/reportPeriod";
import ForwardBookChart from "./ForwardBookChart";
import StageCard from "./StageCard";
import AheadList from "./AheadList";

const KPIS = ["booked_events", "booked_value", "balance_due", "open_events", "open_value", "staffing_coverage"];

// The confirmed work and open pipeline dated today or later: a snapshot that doesn't follow the period.
export default function PipelineAhead({ data, currency }) {
  return (
    <section aria-labelledby="pipeline-ahead" className="space-y-4 pt-3">
      <div>
        <h2 id="pipeline-ahead" className="font-heading text-lg font-semibold text-navy">Pipeline ahead</h2>
        <p className="text-xs text-slate-500">As of today, {rangeLabel({ from: data.today, to: data.today })}: events dated today or later, whatever the period.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={data.ahead[m]} missing="As of today" currency={currency} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ForwardBookChart className="lg:col-span-2" months={data.forward} currency={currency} />
        <StageCard stages={data.stages} currency={currency} />
      </div>
      <AheadList events={data.upcoming} currency={currency} />
    </section>
  );
}