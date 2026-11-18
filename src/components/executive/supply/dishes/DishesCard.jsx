import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtMoney, fmtNumber, fmtPct } from "@/components/executive/kit/formatters";
import { changeOf, changeText, changeTone } from "@/components/executive/kit/change";
import { CLASSES, DISHES_INFO } from "./dishesConfig";

// Every dish of the period with its group, revenue and margin.
export default function DishesCard({ rows, classes, currency }) {
  const label = Object.fromEntries(classes.map((c) => [c.key, c.label]));
  const revenue = (r) => {
    const c = r.previous ? changeOf(r.current.revenue, r.previous.revenue, "money", "up") : null, t = c && changeText(c);
    return <><span className="block">{fmtMoney(r.current.revenue, currency)}</span>{t && <span className={`block text-[11px] ${changeTone(c.better)}`}>{t}</span>}</>;
  };
  const columns = [
    { key: "label", label: "Dish" },
    { key: "class", label: "Group", render: (r) => <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${CLASSES[r.class].tone}`}>{label[r.class]}</span> },
    { key: "events", label: "Events", render: (r) => fmtNumber(r.current.events) },
    { key: "revenue", label: "Revenue", render: revenue },
    { key: "margin_pct", label: "Margin", render: (r) => fmtPct(r.current.margin_pct) },
    { key: "drift", label: "At today's cost", render: (r) => (r.drift === null ? <span className="text-slate-400">No recipe</span> : <span className={r.drift > 0 ? "text-danger-700" : "text-success-700"}>{r.drift > 0 ? "+" : ""}{fmtMoney(r.drift, currency)}</span>) },
  ];
  return (
    <ReportCard title="Dishes served" info={DISHES_INFO}>
      <ListTable rows={rows} columns={columns} currency={currency} rowKey={(r) => r.key} empty="No dishes were served in the period." />
    </ReportCard>
  );
}