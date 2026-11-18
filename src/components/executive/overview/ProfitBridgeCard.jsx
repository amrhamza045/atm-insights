import ReportCard from "@/components/executive/kit/ReportCard";
import Waterfall from "@/components/executive/kit/Waterfall";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";

// How the period's net revenue became net profit, step by step.
export default function ProfitBridgeCard({ figures, currency, className }) {
  const steps = [
    { label: "Net revenue", value: figures.revenue, total: true },
    { label: "Cost of sales", value: -figures.cost_of_sales },
    { label: "Gross profit", value: figures.gross_profit, total: true },
    { label: "Operating expenses", value: -figures.operating_expenses },
    { label: "Other items & tax", value: -(figures.other_result + figures.income_tax) },
    { label: "Net profit", value: figures.net_profit, total: true },
  ];
  return (
    <ReportCard
      title="Revenue to profit"
      info={{
        calculation: "Net revenue, less cost of sales, operating expenses, other income and expenses, finance items and income tax, gives net profit. Green steps add to profit; red steps take away from it.",
        source: METRICS.net_profit.source,
      }}
      className={className}
    >
      <Waterfall steps={steps} currency={currency} />
    </ReportCard>
  );
}