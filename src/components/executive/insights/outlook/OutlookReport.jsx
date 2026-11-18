import ReportState from "@/components/executive/kit/ReportState";
import { financeState, useExecutiveInsights } from "@/components/executive/data/executiveQueries";
import { rangeLabel } from "@/components/executive/period/reportPeriod";
import { fmtMoney } from "@/components/executive/kit/formatters";
import HorizonTable from "./HorizonTable";
import BusiestDays from "./BusiestDays";

// Predictive Analytics: the next 30, 60 and 90 days from the records already
// booked, the open pipeline at its booking rate, and what falls due.
export default function OutlookReport() {
  const query = useExecutiveInsights("outlook", {});
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, c = d.currency;
  const overdue = [
    d.overdue_now > 0 && `${fmtMoney(d.overdue_now, c)} already overdue from clients`,
    d.supplier_overdue > 0 && `${fmtMoney(d.supplier_overdue, c)} already overdue to suppliers`,
  ].filter(Boolean);
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        From {rangeLabel({ from: d.today, to: d.today })}
        {overdue.length > 0 && <span className="text-danger-700"> · {overdue.join(" · ")} (not in the columns below)</span>}
      </p>
      <HorizonTable d={d} />
      <BusiestDays d={d} />
    </div>
  );
}