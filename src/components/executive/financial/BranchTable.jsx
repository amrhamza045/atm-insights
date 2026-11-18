import ReportCard from "@/components/executive/kit/ReportCard";
import InfoTip from "@/components/executive/kit/InfoTip";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import BranchRow from "./BranchRow";

const CHANGE = {
  title: "Change",
  calculation: "The branch's net revenue against its own comparison: the same branch in the comparison period, or the branch's own approved budget for these dates.",
  source: METRICS.revenue.source,
};
const COLUMNS = [["revenue"], ["change", CHANGE], ["gross_margin"], ["operating_expenses"], ["net_profit"], ["net_margin"]];

// The company's branches side by side for the period, the picked branch highlighted.
export default function BranchTable({ data }) {
  const { comparison, company } = data, byBudget = comparison.key === "budget";
  return (
    <ReportCard
      title="Branches side by side"
      info={{ calculation: "Each branch's posted results for the period, every branch against its own comparison. Inactive branches show only while they have postings in the period.", source: METRICS.revenue.source }}
      subtitle={byBudget ? "Each branch against its own approved budget" : `Each branch against its ${comparison.label.toLowerCase()}`}
    >
      {data.branches.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">This company has no branches to compare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th scope="col" className="py-2 text-left font-medium">Branch</th>
                {COLUMNS.map(([key, info]) => (
                  <th key={key} scope="col" className="py-2 pl-3 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      {info ? info.title : METRICS[key].label}
                      {info ? <InfoTip {...info} /> : <InfoTip metric={key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b) => (
                <BranchRow key={b.id} branch={b} selected={b.id === data.selected_branch_id} byBudget={byBudget} currency={company.currency} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportCard>
  );
}