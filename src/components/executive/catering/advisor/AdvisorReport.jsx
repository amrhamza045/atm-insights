import ReportState from "@/components/executive/kit/ReportState";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { rangeLabel } from "@/components/executive/period/reportPeriod";
import FindingCard from "./FindingCard";
import { PRIORITIES } from "./advisorChecks";

// Catering Advisor: fixed checks over the catering reports' own figures for the
// period and its comparison, and over the events ahead as of today, highest priority first.
export default function AdvisorReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("advisor", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, vs = d.comparison.label.toLowerCase();
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        {d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)} · events ahead as of {rangeLabel({ from: d.today, to: d.today })}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {PRIORITIES.map(([key, label, tone]) => (
          <span key={key} className={`rounded-full px-2.5 py-1 font-semibold ${tone}`}>{d.findings.filter((f) => f.priority === key).length} {label.toLowerCase()}</span>
        ))}
        <span className="text-slate-500">{d.checked} checks run on the same figures as the catering reports</span>
      </div>
      {d.findings.length === 0 ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No check was triggered for this period or the events ahead.</p>
      ) : d.findings.map((f) => <FindingCard key={f.key} finding={f} words={{ currency: d.currency, vs }} />)}
    </div>
  );
}