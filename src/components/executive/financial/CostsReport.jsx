import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { useExecutiveFinance } from "@/components/executive/data/executiveQueries";
import LedgerReport from "@/components/executive/kit/LedgerReport";
import RankedTable from "@/components/executive/kit/RankedTable";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import BudgetCard from "./BudgetCard";

const NO_BUDGET = "Budgets are set per section, so accounts have no budget of their own.";
const ACCOUNTS = {
  calculation: "Each cost-of-sales and operating-expense account for the period (debits minus credits), largest first; share is its part of all these costs.",
  source: METRICS.operating_expenses.source,
};
const SECTION = { cogs: "Cost of sales", operating_expenses: "Operating expenses" };

// Costs & Budget: every P&L section against the approved budget, then the
// biggest cost accounts against the chosen comparison.
export default function CostsReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveFinance("costs", { period, compare });
  return (
    <LedgerReport query={query} empty="Nothing has been posted to the profit and loss accounts for this period yet.">
      {(data) => (
        <>
          <BudgetCard data={data} />
          <RankedTable
            title="Biggest cost accounts"
            info={ACCOUNTS}
            note={data.comparison.key === "budget" ? NO_BUDGET : undefined}
            comparison={data.comparison}
            currency={data.company.currency}
            goodWhen="down"
            rows={data.accounts.map((a) => ({ key: a.code, label: a.name, detail: `${a.code} · ${SECTION[a.classification]}`, current: a.current, previous: a.previous }))}
          />
        </>
      )}
    </LedgerReport>
  );
}