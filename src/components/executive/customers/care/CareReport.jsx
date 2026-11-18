import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutiveCustomers } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "@/components/executive/supply/KpiGrid";
import PeriodLine from "@/components/executive/supply/PeriodLine";
import CareNotices from "./CareNotices";
import CareTeamTable from "./CareTeamTable";
import QuietAccountsTable from "./QuietAccountsTable";
import ComplaintsCard from "./ComplaintsCard";
import { KPIS, TREND_INFO, TYPES_CARD } from "./careConfig";

const points = (trend, unit) => trend.map((t) => ({ label: bucketLabel(t.from, unit), current: t.current, previous: t.previous }));

// Client Care: how the team keeps in touch with clients, the complaints they
// hear, the follow-ups they keep, and the accounts going quiet.
export default function CareReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCustomers("care", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, labels = { currentLabel: d.period.label, compareLabel: d.comparison.label };
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <CareNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing="Nothing logged in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Contacts by ${d.unit}`} info={TREND_INFO}>
          <TrendChart data={points(d.trend, d.unit)} format="number" {...labels} />
        </ReportCard>
        <SplitCard {...TYPES_CARD} parts={d.types} />
      </div>
      <CareTeamTable rows={d.team} money={d.money_named} currency={d.currency} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <QuietAccountsTable quiet={d.quiet} />
        <ComplaintsCard rows={d.complaints} />
      </div>
    </div>
  );
}