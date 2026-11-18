import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { RECIPE_INFO } from "./kitchenConfig";

const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
// Red when the batches cost more than their recipes, green when less.
const tone = (v) => (v == null || Math.abs(v) < 1 ? "" : v > 0 ? "text-danger-700" : "text-success-700");

// Every recipe the period's batches were made from, highest cost first.
export default function RecipeTable({ rows, currency }) {
  const columns = [
    { key: "name", label: "Recipe" },
    { key: "batches", label: "Batches", format: "number" },
    { key: "output", label: "Output", render: (r) => `${quantity.format(r.output)} ${r.unit}`.trim() },
    { key: "yield_pct", label: "Yield", format: "percent" },
    { key: "cost", label: "Cost", format: "money" },
    { key: "over_recipe", label: "vs recipe", render: (r) => <span className={tone(r.over_recipe)}>{r.over_recipe > 0 ? "+" : ""}{fmtMoney(r.over_recipe, currency)}</span> },
  ];
  return (
    <ReportCard title="By recipe" info={RECIPE_INFO}>
      <ListTable rows={rows} columns={columns} currency={currency} empty="No batches were finished in the period." />
    </ReportCard>
  );
}