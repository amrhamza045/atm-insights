import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { useExecutiveFinance } from "@/components/executive/data/executiveQueries";
import LedgerReport from "@/components/executive/kit/LedgerReport";
import KpiCard from "@/components/executive/kit/KpiCard";
import RankedTable from "@/components/executive/kit/RankedTable";
import { missingText } from "@/components/executive/kit/compareNotes";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import LedgerTrendCard from "./LedgerTrendCard";

const NO_BUDGET = "Budgets are set per section, so accounts and channels have no budget of their own.";
const TREND_NOTE = "The comparison line sets each day or month beside the matching day or month of the comparison period, or beside that day's or month's share of the budget.";
const ACCOUNTS = { calculation: "Net revenue of each income account for the period (credits minus debits), largest first.", source: METRICS.revenue.source };
const CHANNELS = {
  calculation: "Net revenue by the sales channel of the order or event behind each posted entry, largest first. Entries without a channel show as Not linked to a channel. A channel whose module is switched off stays counted, tagged Module off.",
  source: METRICS.revenue.source,
};

// Revenue: net revenue and its trend, then ranked by income account and by sales channel.
export default function RevenueReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveFinance("revenue", { period, compare });
  return (
    <LedgerReport query={query} empty="No revenue has been posted for this period yet.">
      {(data) => {
        const { comparison, company } = data, note = comparison.key === "budget" ? NO_BUDGET : undefined;
        const table = { note, comparison, currency: company.currency };
        return (
          <>
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <KpiCard
                metric="revenue"
                value={data.current.revenue}
                previous={data.previous.revenue}
                compareLabel={comparison.label.toLowerCase()}
                missing={missingText(comparison)}
                currency={company.currency}
                spark={data.trend.map((t) => t.current)}
              />
              <LedgerTrendCard data={data} title={`Net revenue by ${data.unit}`} metric="revenue" note={TREND_NOTE} className="lg:col-span-2" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <RankedTable title="By income account" info={ACCOUNTS} {...table}
                rows={data.accounts.map((a) => ({ key: a.code, label: a.name, detail: a.code, current: a.current, previous: a.previous }))} />
              <RankedTable title="By sales channel" info={CHANNELS} {...table}
                rows={data.channels.map((c) => ({ key: c.key, label: c.label, tag: c.module_off ? "Module off" : null, current: c.current, previous: c.previous }))} />
            </div>
          </>
        );
      }}
    </LedgerReport>
  );
}