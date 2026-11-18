import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { useExecutiveFinance } from "@/components/executive/data/executiveQueries";
import LedgerReport from "@/components/executive/kit/LedgerReport";
import KpiCard from "@/components/executive/kit/KpiCard";
import { missingText } from "@/components/executive/kit/compareNotes";
import LedgerTrendCard from "./LedgerTrendCard";
import CashBridgeCard from "./CashBridgeCard";
import BalancesCard from "./BalancesCard";

const FIGURES = ["closing_cash", "cash_received", "cash_paid", "net_cash_change"];
const TREND_NOTE = "Cash and bank balance at the end of each day or month; the comparison line is the balance on the matching day or month of the comparison period.";

// Cash & Balances: cash in the period, how it moved, and what is owed either way.
export default function CashReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveFinance("cash", { period, compare });
  return (
    <LedgerReport query={query} empty="Nothing has been posted to the ledger for this period yet.">
      {(data) => (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {FIGURES.map((key) => (
              <KpiCard
                key={key}
                metric={key}
                value={data.current[key]}
                previous={data.previous?.[key]}
                compareLabel={data.comparison.label.toLowerCase()}
                missing={missingText(data.comparison)}
                currency={data.company.currency}
                spark={key === "closing_cash" ? data.trend.map((t) => t.current) : undefined}
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <CashBridgeCard data={data} />
            <LedgerTrendCard data={data} title={`Cash balance by ${data.unit}`} metric="closing_cash" note={TREND_NOTE} className="lg:col-span-2" />
          </div>
          <BalancesCard data={data} />
        </>
      )}
    </LedgerReport>
  );
}