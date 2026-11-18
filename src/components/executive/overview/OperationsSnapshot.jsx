import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";

const PERIOD = ["events_held", "held_value", "avg_event_value", "collected"];
const AHEAD = ["booked_events", "booked_value", "balance_due", "open_events", "open_value"];
const CRM = ["new_leads", "new_clients"];

// Catering and CRM figures for the period, and the catering work booked ahead.
// A group whose module is switched off is left out.
export default function OperationsSnapshot({ query, currency }) {
  if (query.isLoading) return <ReportState state="loading" compact />;
  if (query.isError) return <ReportState state="error" message={query.error.message} onRetry={query.refetch} compact />;
  const { catering, crm, comparison } = query.data;
  const label = comparison.label.toLowerCase(), missing = comparison.available ? "No comparison" : "Not budgeted";
  const card = (group, key) => (
    <KpiCard key={key} metric={key} value={group.current[key]} previous={group.previous?.[key]} compareLabel={label} missing={missing} currency={currency} />
  );
  return (
    <>
      {catering.available && (
        <ReportCard title="Catering" subtitle="Events and payments in the period, then the confirmed work and pipeline ahead as of today">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{PERIOD.map((key) => card(catering, key))}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {AHEAD.map((key) => <KpiCard key={key} metric={key} value={catering.ahead[key]} missing="As of today" currency={currency} />)}
          </div>
        </ReportCard>
      )}
      {crm.available && (
        <ReportCard title="CRM" subtitle="New leads and clients in the period">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{CRM.map((key) => card(crm, key))}</div>
        </ReportCard>
      )}
    </>
  );
}