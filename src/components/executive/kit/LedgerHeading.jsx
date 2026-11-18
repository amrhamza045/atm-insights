import { Badge } from "@/components/ui/badge";
import { rangeLabel } from "@/components/executive/period/reportPeriod";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Which ledger and dates a report covers, and anything that leaves its figures
// incomplete. empty: what to say when nothing was posted in the period.
export default function LedgerHeading({ data, empty = "Nothing has been posted to the ledger for this period yet." }) {
  const { company, period, comparison } = data;
  const notes = [
    comparison.reason === "no_budget" && "No approved budget covers this company or branch for these dates. Approve one in Finance › Budget & forecast to compare with it.",
    comparison.reason === "not_budgeted" && "Budgets don't cover cash or balances, so these figures have no budget comparison. Compare with the previous period or the same period last year instead.",
    data.pending_proposals > 0 && `${plural(data.pending_proposals, "journal is", "journals are")} waiting for review in this period and not included yet.`,
    data.posting_issues > 0 && `${plural(data.posting_issues, "automatic posting is", "automatic postings are")} blocked in this period and not included until Finance resolves ${data.posting_issues === 1 ? "it" : "them"}.`,
    !data.has_activity && empty,
  ].filter(Boolean);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        <span className="font-heading font-semibold text-navy">{company.name}</span>
        {company.is_test && <Badge variant="outline" className="text-[10px]">Test company</Badge>}
        <span>· {period.label}: {rangeLabel(period)}</span>
        {comparison.key !== "budget" && <span className="text-slate-400">vs {comparison.label.toLowerCase()}: {rangeLabel(comparison)}</span>}
      </div>
      {notes.map((note) => (
        <p key={note} role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">{note}</p>
      ))}
    </div>
  );
}