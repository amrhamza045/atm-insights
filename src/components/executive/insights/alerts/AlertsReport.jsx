import ReportState from "@/components/executive/kit/ReportState";
import { financeState, useExecutiveInsights } from "@/components/executive/data/executiveQueries";
import { rangeLabel } from "@/components/executive/period/reportPeriod";
import { PRIORITIES } from "@/components/executive/catering/advisor/advisorChecks";
import AlertCard from "./AlertCard";

const AREA_LABELS = { catering: "Catering", suppliers: "Suppliers", purchases: "Purchasing", inventory: "Stock", crm: "CRM", financial: "Finance" };

// Alerts Center: what needs attention today across the modules switched on,
// highest priority first, each linked to the screen where it is fixed.
export default function AlertsReport() {
  const query = useExecutiveInsights("alerts", {});
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, words = { currency: d.currency };
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        As of {rangeLabel({ from: d.today, to: d.today })} <span className="text-slate-400">· checks {d.areas.map((a) => AREA_LABELS[a]).join(", ")}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {PRIORITIES.map(([key, label, tone]) => (
          <span key={key} className={`rounded-full px-2.5 py-1 font-semibold ${tone}`}>{d.alerts.filter((a) => a.priority === key).length} {label.toLowerCase()}</span>
        ))}
      </div>
      {d.alerts.length === 0 ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nothing needs attention right now.</p>
      ) : d.alerts.map((a) => <AlertCard key={a.key} alert={a} words={words} />)}
    </div>
  );
}