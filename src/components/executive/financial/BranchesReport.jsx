import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { useExecutiveFinance } from "@/components/executive/data/executiveQueries";
import LedgerReport from "@/components/executive/kit/LedgerReport";
import BranchTable from "./BranchTable";

// Branch Comparison: every branch of the picked company side by side.
export default function BranchesReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveFinance("branches", { period, compare });
  return (
    <LedgerReport query={query} empty="Nothing has been posted to the profit and loss accounts for this period yet.">
      {(data) => <BranchTable data={data} />}
    </LedgerReport>
  );
}