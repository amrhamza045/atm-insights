import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { PRICE_INFO } from "./purchasingConfig";

const tone = (impact) => (impact > 0 ? "text-danger-700" : "text-success-700");

// What items cost per unit now against the comparison, and what the change cost.
export default function PriceChangesCard({ rows, comparison, compared, currency }) {
  const perUnit = (v, r) => `${fmtMoney(v, currency)} / ${r.unit || "unit"}`;
  const columns = [
    { key: "name", label: "Item" },
    { key: "price", label: "Average price", render: (r) => perUnit(r.price, r) },
    { key: "previous_price", label: comparison.label, render: (r) => <span className="text-slate-500">{perUnit(r.previous_price, r)}</span> },
    { key: "change_pct", label: "Change", render: (r) => <span className={tone(r.impact)}>{r.change_pct === null ? "—" : `${r.change_pct > 0 ? "+" : ""}${r.change_pct.toFixed(1)}%`}</span> },
    { key: "impact", label: "Effect", render: (r) => <span className={tone(r.impact)}>{fmtMoney(r.impact, currency)}</span> },
  ];
  return (
    <ReportCard title="Price changes" info={PRICE_INFO}>
      {compared
        ? <ListTable rows={rows} columns={columns} currency={currency} rowKey={(r) => r.key} empty="No item was bought in both periods at a different price." />
        : <p className="py-6 text-center text-sm text-slate-500">There were no purchases in the comparison period to compare prices with.</p>}
    </ReportCard>
  );
}