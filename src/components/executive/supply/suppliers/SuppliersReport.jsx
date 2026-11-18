import ReportState from "@/components/executive/kit/ReportState";
import ReportNotice from "@/components/executive/kit/ReportNotice";
import RankedTable from "@/components/executive/kit/RankedTable";
import { financeState, useExecutiveSupply } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import KpiGrid from "../KpiGrid";
import PeriodLine from "../PeriodLine";
import LedgerCheckCard from "../LedgerCheckCard";
import PerformanceCard from "./PerformanceCard";
import { KPIS, SPEND_INFO, LEDGER_CARD } from "./suppliersConfig";

// Suppliers: who was bought from in the period, how they delivered and were rated, and what they're owed.
export default function SuppliersReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveSupply("suppliers", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency;
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      {!d.has_activity && <ReportNotice>No purchase invoices were posted, no deliveries were recorded and no supplier was rated in this period.</ReportNotice>}
      <KpiGrid kpis={KPIS} data={d} missing="No purchases or deliveries in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <RankedTable title="Purchases by supplier" info={SPEND_INFO} rows={d.spend} comparison={d.comparison} currency={cur} goodWhen="none" />
        <LedgerCheckCard {...LEDGER_CARD} ledger={d.ledger} currency={cur} />
      </div>
      <PerformanceCard rows={d.performance} currency={cur} />
    </div>
  );
}