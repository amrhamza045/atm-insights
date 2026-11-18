import InfoTip from "@/components/executive/kit/InfoTip";
import ChangeCell from "@/components/executive/kit/ChangeCell";
import { fmtMoney, fmtPct } from "@/components/executive/kit/formatters";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import { lineValue } from "./pnlLines";

const FLAG = { true: "bg-success-50 text-success-700", false: "bg-danger-50 text-danger-700", null: "bg-slate-100 text-slate-600" };
const BAR = { true: "bg-success-500", false: "bg-danger-500", null: "bg-gold" };

// Where a section stands against its budget: costs should stay under it,
// income and profit should reach it.
function standing(def, actual, budget) {
  if (actual == null || budget == null) return null;
  const diff = actual - budget;
  if (Math.abs(diff) <= Math.abs(budget) * 0.001) return { label: "On budget", good: null };
  const over = diff > 0, good = over === (def.goodWhen === "up");
  return { label: def.goodWhen === "up" ? (over ? "Ahead of budget" : "Behind budget") : over ? "Over budget" : "Under budget", good };
}

// One section: actual, budget, how much of the budget is used, the variance and its flag.
export default function BudgetRow({ line, actual, budget, currency }) {
  const def = METRICS[line.key], value = lineValue(actual, line), target = lineValue(budget, line);
  const status = standing(def, value, target), used = target > 0 && value != null ? (value / target) * 100 : null;
  return (
    <tr className={`border-b border-slate-100 ${line.total ? "bg-cream/60 font-semibold text-navy" : "text-slate-700"}`}>
      <th scope="row" className="py-2 pr-3 text-left font-[inherit]">
        <span className="flex items-center gap-1.5">{def.label}<InfoTip metric={line.key} /></span>
      </th>
      <td className="py-2 pl-3 text-right tabular-nums">{fmtMoney(value, currency)}</td>
      <td className="py-2 pl-3 text-right tabular-nums text-slate-500">
        {target == null ? <span className="text-xs text-slate-400">Budget has empty months</span> : fmtMoney(target, currency)}
      </td>
      <td className="py-2 pl-3">
        {used == null ? (
          <span className="block text-right text-xs text-slate-400">—</span>
        ) : (
          <span className="flex items-center justify-end gap-2">
            <span className="h-1.5 w-20 rounded-full bg-slate-100" aria-hidden="true">
              <span className={`block h-1.5 rounded-full ${BAR[status?.good ?? null]}`} style={{ width: `${Math.min(Math.max(used, 0), 100)}%` }} />
            </span>
            <span className="w-12 text-right text-xs tabular-nums text-slate-500">{fmtPct(used, 0)}</span>
          </span>
        )}
      </td>
      <td className="py-2 pl-3 text-right"><ChangeCell value={value} previous={target} goodWhen={def.goodWhen} currency={currency} /></td>
      <td className="py-2 pl-3 text-right">
        {status && <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${FLAG[status.good]}`}>{status.label}</span>}
      </td>
    </tr>
  );
}