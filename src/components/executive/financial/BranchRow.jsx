import { Badge } from "@/components/ui/badge";
import ChangeCell from "@/components/executive/kit/ChangeCell";
import FigureCell from "@/components/executive/kit/FigureCell";
import { fmtMoney } from "@/components/executive/kit/formatters";

const FIGURES = ["gross_margin", "operating_expenses", "net_profit", "net_margin"];

// One branch: its net revenue and change, then each figure with its own change.
export default function BranchRow({ branch, selected, byBudget, currency }) {
  const { current, previous } = branch;
  const missing = !byBudget ? "No comparison" : previous ? "Budget has empty months" : "No budget";
  return (
    <tr className={`border-b border-slate-100 last:border-0 ${selected ? "bg-cream" : ""}`}>
      <th scope="row" className="py-2 pr-3 text-left font-medium text-navy">
        <span className="flex flex-wrap items-center gap-1.5">
          {branch.name}
          {selected && <Badge className="bg-navy text-[10px] text-white hover:bg-navy">Picked branch</Badge>}
          {!branch.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
        </span>
      </th>
      <td className="py-2 pl-3 text-right tabular-nums">{fmtMoney(current.revenue, currency)}</td>
      <td className="py-2 pl-3 text-right">
        <ChangeCell value={current.revenue} previous={previous?.revenue} currency={currency} missing={missing} />
      </td>
      {FIGURES.map((key) => (
        <FigureCell key={key} metric={key} value={current[key]} previous={previous?.[key]} currency={currency} />
      ))}
    </tr>
  );
}