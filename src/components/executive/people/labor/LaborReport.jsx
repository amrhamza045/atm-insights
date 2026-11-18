import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import { financeState, useExecutivePeople } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "@/components/executive/supply/KpiGrid";
import PeriodLine from "@/components/executive/supply/PeriodLine";
import LedgerCheckCard from "@/components/executive/supply/LedgerCheckCard";
import LaborNotices from "./LaborNotices";
import PayMakeupCard from "./PayMakeupCard";
import PayGroupTable from "./PayGroupTable";
import { KPIS, groupInfo, LEDGER_CARD } from "./laborConfig";

const points = (trend) => trend.map((t) => ({ label: bucketLabel(t.from, "month"), current: t.current, previous: t.previous }));
// "Dec 25 – Sep 26": the first and last month paid.
const monthsLabel = (months) => (months.length ? [...new Set([months[0], months.at(-1)].map((m) => bucketLabel(`${m}-01`, "month")))].join(" – ") : "No months paid");

// Labor Cost: the payroll of the period's paid months, what it is made of and
// where it went, beside revenue, the events it served and the ledger.
export default function LaborReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutivePeople("labor", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, labels = { currentLabel: d.period.label, compareLabel: d.comparison.label };
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <LaborNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing={d.comparison_partial ? "No payroll for the same months in the comparison period" : "No payroll in the comparison period"} />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title="Payroll cost by month" info={{ metric: "labor_payroll_cost" }}>
          <TrendChart data={points(d.trend)} currency={cur} {...labels} />
        </ReportCard>
        <PayMakeupCard makeup={d.makeup} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PayGroupTable title="By department" by="Department" rows={d.by_department} currency={cur} info={groupInfo("department")} />
        <PayGroupTable title="By branch" by="Branch" rows={d.by_branch} currency={cur} info={groupInfo("branch")} />
      </div>
      <LedgerCheckCard {...LEDGER_CARD} when={monthsLabel(d.months.counted)} ledger={d.ledger} currency={cur} />
    </div>
  );
}