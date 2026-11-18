import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import { financeState, useExecutiveCustomers } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "@/components/executive/supply/KpiGrid";
import PeriodLine from "@/components/executive/supply/PeriodLine";
import ClientsNotices from "./ClientsNotices";
import ServedChart from "./ServedChart";
import TopClientsTable from "./TopClientsTable";
import WinBackTable from "./WinBackTable";
import { KPIS, SERVED_INFO, TYPE_COLUMNS, TYPE_INFO, DUE_INFO, QUIET_INFO } from "./clientsConfig";

const points = (trend, unit) => trend.map((t) => ({ label: bucketLabel(t.from, unit), first_time: t.first_time, returning: t.returning, previous: t.previous }));

// Clients & Retention: who the picked branches served in the period, first-time
// or returning, who they earn the most from, and who to win back today.
export default function ClientsReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCustomers("clients", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, money = d.money_named;
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <ClientsNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing="No events delivered in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Clients served by ${d.unit}`} info={SERVED_INFO}>
          <ServedChart data={points(d.trend, d.unit)} compareLabel={d.comparison.label} />
        </ReportCard>
        <SegmentTable title="By client type" rows={d.by_type} currency={cur} columns={TYPE_COLUMNS} info={TYPE_INFO} empty="No events were delivered in this period." />
      </div>
      <TopClientsTable rows={d.top_clients} money={money} currency={cur} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <WinBackTable title="Due to rebook" subtitle={`Latest event ${rangeLabel(d.rebook_window)}`} info={DUE_INFO} list={d.due} money={money} currency={cur} empty="No client's occasion from last year is coming round." />
        <WinBackTable title="Gone quiet" subtitle="Latest event over a year ago" info={QUIET_INFO} list={d.quiet} money={money} currency={cur} empty="No client has gone quiet." />
      </div>
    </div>
  );
}