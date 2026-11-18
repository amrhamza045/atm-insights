import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtPct } from "@/components/executive/kit/formatters";
import { MENU_INFO } from "./dishesConfig";

const COLUMNS = [
  { key: "name", label: "Dish", render: (r) => <><span className="block truncate" dir="auto">{r.name}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{[r.category, r.branch].filter(Boolean).join(" · ")}</span></> },
  { key: "price", label: "Price", format: "money" },
  { key: "cost", label: "Cost today", format: "money" },
  { key: "food_cost_pct", label: "Food cost", render: (r) => <span className={r.food_cost_pct > 100 ? "text-danger-700" : ""}>{fmtPct(r.food_cost_pct)}</span> },
  { key: "target", label: "Target margin", render: (r) => (r.target === null ? "—" : fmtPct(r.target, 0)) },
  { key: "flag", label: "", render: (r) => (r.food_cost_pct > 100 ? <span className="rounded-full bg-danger-50 px-1.5 py-0.5 text-[11px] text-danger-700">Costs more than its price</span> : r.below_target ? <span className="rounded-full bg-warning-50 px-1.5 py-0.5 text-[11px] text-warning-800">Below target</span> : null) },
];

// The menu's dishes at today's recipe cost against their price.
export default function FoodCostCard({ rows, currency }) {
  return (
    <ReportCard title="Menu food cost today" subtitle="As of today" info={MENU_INFO}>
      <ListTable rows={rows} columns={COLUMNS} currency={currency} empty="No dish on the menu has both a price and a costed recipe." />
    </ReportCard>
  );
}