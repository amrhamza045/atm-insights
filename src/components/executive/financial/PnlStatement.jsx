import ReportCard from "@/components/executive/kit/ReportCard";
import { missingText } from "@/components/executive/kit/compareNotes";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import PnlSection from "./PnlSection";
import { PNL_LINES } from "./pnlLines";

const head = "py-2 text-right font-medium";

// One statement: each line for the period, the comparison and the change; a +
// opens a section's accounts. Budgets are set per section, so with Budget
// chosen the accounts show none.
export default function PnlStatement({ data }) {
  const { period, comparison } = data, byBudget = comparison.key === "budget";
  return (
    <ReportCard
      title="Profit & Loss"
      info={{
        calculation: "Every revenue, cost, other income and expense and income-tax account of the period, totalled into the statement's sections. Press + beside a section to see its accounts.",
        source: METRICS.revenue.source,
      }}
      subtitle={byBudget ? "Sections against the approved budget. Budgets are set per section, so accounts show no budget." : `Against the ${comparison.label.toLowerCase()}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th scope="col" className="py-2 text-left font-medium">Line</th>
              <th scope="col" className={head}>{period.label}</th>
              <th scope="col" className={head}>{comparison.label}</th>
              <th scope="col" className={head}>Change</th>
            </tr>
          </thead>
          <tbody>
            {PNL_LINES.map((line) => (
              <PnlSection key={line.key} line={line} data={data} missing={missingText(comparison)} byBudget={byBudget} />
            ))}
          </tbody>
        </table>
      </div>
    </ReportCard>
  );
}