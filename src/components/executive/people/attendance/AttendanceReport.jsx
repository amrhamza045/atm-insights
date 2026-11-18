import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutivePeople } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "@/components/executive/supply/KpiGrid";
import PeriodLine from "@/components/executive/supply/PeriodLine";
import AttendanceNotices from "./AttendanceNotices";
import LatenessCard from "./LatenessCard";
import AttendanceTable from "./AttendanceTable";
import { KPIS, SHIFTS_CARD, DEPARTMENT_INFO, PERSON_INFO } from "./attendanceConfig";

const points = (trend, unit) => trend.map((t) => ({ label: bucketLabel(t.from, unit), current: t.current, previous: t.previous }));

// Attendance & Hours: every shift of the period — attended, on time and
// dependable — with hours, overtime, and the clock-ins still waiting for HR.
export default function AttendanceReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutivePeople("attendance", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, labels = { currentLabel: d.period.label, compareLabel: d.comparison.label };
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <AttendanceNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing="No clock-ins in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Hours worked by ${d.unit}`} info={{ metric: "att_hours" }}>
          <TrendChart data={points(d.trend, d.unit)} format="hours" {...labels} />
        </ReportCard>
        <SplitCard {...SHIFTS_CARD} parts={d.shifts} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ReportCard title={`On time by ${d.unit}`} info={{ metric: "att_on_time_rate" }}>
          <TrendChart data={points(d.on_time_trend, d.unit)} format="percent" {...labels} />
        </ReportCard>
        <LatenessCard data={d} />
      </div>
      <AttendanceTable title="By department" info={DEPARTMENT_INFO} rows={d.by_department} />
      {d.by_person
        ? <AttendanceTable title="By person" info={PERSON_INFO} rows={d.by_person} person />
        : <p className="text-xs text-slate-500">Each person's attendance is listed for people who can open HR records.</p>}
    </div>
  );
}