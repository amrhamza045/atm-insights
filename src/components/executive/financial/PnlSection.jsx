import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import InfoTip from "@/components/executive/kit/InfoTip";
import ChangeCell from "@/components/executive/kit/ChangeCell";
import { fmtValue } from "@/components/executive/kit/formatters";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";
import PnlAccountRow from "./PnlAccountRow";
import { lineValue } from "./pnlLines";

// One statement line; a section with posted accounts opens them under it with +.
export default function PnlSection({ line, data, missing, byBudget }) {
  const [open, setOpen] = useState(false);
  const def = METRICS[line.key], currency = data.company.currency;
  const value = lineValue(data.current, line), previous = lineValue(data.previous, line);
  const accounts = line.accounts ? data.accounts.filter((a) => a.classification === line.accounts) : [];
  const Toggle = open ? Minus : Plus;
  return (
    <>
      <tr className={`border-b border-slate-100 ${line.total ? "bg-cream/60 font-semibold text-navy" : line.ratio ? "text-slate-500" : "text-slate-700"}`}>
        <th scope="row" className="py-2 pr-3 text-left font-[inherit]">
          <span className="flex items-center gap-1.5">
            {accounts.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={`${open ? "Hide" : "Show"} the accounts of ${def.label}`}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-slate-300 text-slate-500 hover:border-gold hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Toggle className="h-3 w-3" />
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" aria-hidden="true" />
            )}
            {def.label}
            <InfoTip metric={line.key} />
          </span>
        </th>
        <td className="py-2 text-right tabular-nums">{fmtValue(value, def.format, currency)}</td>
        <td className="py-2 pl-3 text-right tabular-nums text-slate-500">
          {previous == null ? <span className="text-xs text-slate-400">{missing}</span> : fmtValue(previous, def.format, currency)}
        </td>
        <td className="py-2 pl-3 text-right">
          <ChangeCell value={value} previous={previous} format={def.format} goodWhen={def.goodWhen} currency={currency} />
        </td>
      </tr>
      {open && accounts.map((a) => <PnlAccountRow key={a.code} account={a} goodWhen={def.goodWhen} currency={currency} byBudget={byBudget} />)}
    </>
  );
}