import { Link } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import { FINANCE_BUDGET_URL } from "@/components/executive/kit/compareNotes";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import { PNL_LINES } from "./pnlLines";
import BudgetRow from "./BudgetRow";

const LINES = PNL_LINES.filter((l) => !l.ratio);
const head = "py-2 pl-3 text-right font-medium";
const INFO = {
  calculation: "Each section's posted amount for the period beside the approved budget for the same dates; a month's budget is spread evenly over its days. Used is actual ÷ budget × 100. Costs over budget, and income or profit behind budget, show in red.",
  source: `${METRICS.revenue.source} Budget: the approved budget of this company or branch in Finance › Budget & forecast.`,
};

// Every P&L section against the approved budget for the period, whatever comparison is chosen.
export default function BudgetCard({ data }) {
  return (
    <ReportCard title="Against budget" info={INFO} subtitle={`${data.period.label} against the approved budget for the same dates`}>
      {data.budget ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th scope="col" className="py-2 text-left font-medium">Section</th>
                <th scope="col" className={head}>Actual</th>
                <th scope="col" className={head}>Budget</th>
                <th scope="col" className={head}>Used</th>
                <th scope="col" className={head}>Variance</th>
                <th scope="col" className={head}>Status</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((line) => <BudgetRow key={line.key} line={line} actual={data.actual} budget={data.budget} currency={data.company.currency} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
          No approved budget covers this company or branch for these dates.{" "}
          <Link to={FINANCE_BUDGET_URL} className="font-medium underline underline-offset-2">Set one in Finance › Budget & forecast</Link> to track the period against it.
        </p>
      )}
    </ReportCard>
  );
}