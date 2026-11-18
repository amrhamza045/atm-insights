import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { useExecutiveFinance } from "@/components/executive/data/executiveQueries";
import LedgerReport from "@/components/executive/kit/LedgerReport";
import PnlStatement from "./PnlStatement";

// Profit & Loss: the period's statement from the posted ledger.
export default function PnlReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveFinance("pnl", { period, compare });
  return (
    <LedgerReport query={query} empty="Nothing has been posted to the profit and loss accounts for this period yet.">
      {(data) => <PnlStatement data={data} />}
    </LedgerReport>
  );
}