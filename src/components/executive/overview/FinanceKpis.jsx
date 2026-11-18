import KpiCard from "@/components/executive/kit/KpiCard";

const FIGURES = ["revenue", "cost_of_sales", "gross_profit", "gross_margin", "operating_expenses", "net_profit", "net_margin", "closing_cash"];

// The period's ledger results, each against the chosen comparison.
export default function FinanceKpis({ data }) {
  const { comparison, company } = data;
  const missing = (key) => {
    if (comparison.key !== "budget") return "No comparison";
    if (key === "closing_cash") return "Not budgeted";
    return comparison.available ? "Budget has empty months" : "No approved budget";
  };
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {FIGURES.map((key) => (
        <KpiCard
          key={key}
          metric={key}
          value={data.current[key]}
          previous={data.previous?.[key]}
          compareLabel={comparison.label.toLowerCase()}
          missing={missing(key)}
          currency={company.currency}
          spark={data.trend.map((t) => t.current[key])}
        />
      ))}
    </div>
  );
}