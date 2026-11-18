import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { useExecutiveFinance, useExecutiveMetrics, financeState } from "@/components/executive/data/executiveQueries";
import ReportState from "@/components/executive/kit/ReportState";
import AiSectionSummary from "@/components/insights/AiSectionSummary";
import LedgerHeading from "@/components/executive/kit/LedgerHeading";
import FinanceKpis from "./FinanceKpis";
import TrendCard from "./TrendCard";
import ProfitBridgeCard from "./ProfitBridgeCard";
import OperationsSnapshot from "./OperationsSnapshot";

// What the AI summary reads: the same totals the page shows.
const aiFacts = (finance, metrics) => ({
  currency: finance.company.currency,
  period: `${finance.period.label}, ${finance.period.from} to ${finance.period.to}`,
  compared_with: finance.comparison.label,
  ledger: finance.current,
  ledger_comparison: finance.previous,
  catering: metrics.catering.available ? { ...metrics.catering.current, ...metrics.catering.ahead } : "module switched off",
  crm: metrics.crm.available ? metrics.crm.current : "module switched off",
});

// Executive Summary: the period's posted-ledger results against the chosen
// comparison, how revenue became profit, and the catering and CRM snapshot.
export default function OverviewPage() {
  const { period, compare } = useReportPeriod();
  const finance = useExecutiveFinance("summary", { period, compare });
  const metrics = useExecutiveMetrics({ period, compare });
  const state = financeState(finance), data = finance.data;
  return (
    <div className="space-y-5">
      {state ? (
        <ReportState state={state} message={finance.error?.message} onRetry={state === "error" ? finance.refetch : undefined} />
      ) : (
        <>
          <LedgerHeading data={data} />
          <FinanceKpis data={data} />
          {data.has_activity && (
            <div className="grid gap-4 lg:grid-cols-3">
              <TrendCard data={data} className="lg:col-span-2" />
              <ProfitBridgeCard figures={data.current} currency={data.company.currency} />
            </div>
          )}
        </>
      )}
      <OperationsSnapshot query={metrics} currency={data?.company?.currency} />
      {!state && metrics.data && <AiSectionSummary title="Executive Summary" facts={aiFacts(data, metrics.data)} />}
    </div>
  );
}