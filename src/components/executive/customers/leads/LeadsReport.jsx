import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import { financeState, useExecutiveCustomers } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "@/components/executive/supply/KpiGrid";
import PeriodLine from "@/components/executive/supply/PeriodLine";
import LeadsNotices from "./LeadsNotices";
import ReferralsCard from "./ReferralsCard";
import ReferrersTable from "./ReferrersTable";
import { KPIS, TREND_INFO, STAGES_CARD, COLUMNS, SHORT_COLUMNS, groupInfo } from "./leadsConfig";

const points = (trend, unit) => trend.map((t) => ({ label: bucketLabel(t.from, unit), current: t.current, previous: t.previous }));
const EMPTY = "No leads were entered in this period.";

// Leads & Sources: the leads that came in, where from and what became of
// them, with the guest referrals and their commissions.
export default function LeadsReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCustomers("leads", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, labels = { currentLabel: d.period.label, compareLabel: d.comparison.label };
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <LeadsNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing="No leads in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`New leads by ${d.unit}`} info={TREND_INFO}>
          <TrendChart data={points(d.trend, d.unit)} format="number" {...labels} />
        </ReportCard>
        <SplitCard {...STAGES_CARD} parts={d.stages} />
      </div>
      <SegmentTable title="By source" rows={d.by_source} currency={cur} columns={COLUMNS} info={groupInfo("source")} empty={EMPTY} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SegmentTable title="By campaign" rows={d.by_campaign} currency={cur} columns={SHORT_COLUMNS} info={groupInfo("campaign")} empty={EMPTY} />
        <SegmentTable title="By area" rows={d.by_area} currency={cur} columns={SHORT_COLUMNS} info={groupInfo("area")} empty={EMPTY} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ReferralsCard referrals={d.referrals} comparison={d.comparison} currency={cur} />
        <ReferrersTable referrals={d.referrals} currency={cur} />
      </div>
    </div>
  );
}