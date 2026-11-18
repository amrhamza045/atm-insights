import ReportState from "./ReportState";
import LedgerHeading from "./LedgerHeading";
import { financeState } from "@/components/executive/data/executiveQueries";

// The frame of a report read from the posted ledger: its state while loading,
// indexing, switched off or without a Finance company, else the ledger
// heading and the report. children(data) draws the report.
export default function LedgerReport({ query, empty, children }) {
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  return (
    <div className="space-y-5">
      <LedgerHeading data={query.data} empty={empty} />
      {children(query.data)}
    </div>
  );
}