import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutivePeople } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "@/components/executive/supply/KpiGrid";
import PeriodLine from "@/components/executive/supply/PeriodLine";
import WorkforceNotices from "./WorkforceNotices";
import HeadcountTable from "./HeadcountTable";
import AppraisalsCard from "./AppraisalsCard";
import { KPIS, TREND_INFO, TYPES_CARD, tableInfo, DISCIPLINE_CARD } from "./workforceConfig";

const points = (trend, unit) => trend.map((t) => ({ label: bucketLabel(t.from, unit), current: t.current, previous: t.previous }));

// Workforce: who is employed today, who joined and left in the period, and
// the period's appraisals and disciplinary actions.
export default function WorkforceReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutivePeople("workforce", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, labels = { currentLabel: d.period.label, compareLabel: d.comparison.label };
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <WorkforceNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing="Nothing recorded in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Headcount by ${d.unit}`} info={TREND_INFO}>
          <TrendChart data={points(d.trend, d.unit)} format="number" {...labels} />
        </ReportCard>
        <SplitCard {...TYPES_CARD} parts={d.types} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <HeadcountTable title="By department" by="Department" rows={d.by_department} info={tableInfo("department")} />
        <HeadcountTable title="By branch" by="Branch" rows={d.by_branch} info={tableInfo("branch")} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <AppraisalsCard appraisals={d.appraisals} decided={d.current.wf_appraisals} />
        <SplitCard {...DISCIPLINE_CARD} parts={d.discipline} />
      </div>
    </div>
  );
}