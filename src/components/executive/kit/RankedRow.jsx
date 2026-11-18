import { Badge } from "@/components/ui/badge";
import ChangeCell from "./ChangeCell";
import { fmtMoney, fmtPct } from "./formatters";

// One row of a ranked table, its share drawn as a small gold bar.
export default function RankedRow({ row, share, compared, goodWhen, currency }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <th scope="row" className="py-2 pr-3 text-left font-normal">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-slate-700">{row.label}</span>
          {row.tag && <Badge variant="outline" className="shrink-0 text-[10px] text-slate-500">{row.tag}</Badge>}
        </span>
        {row.detail && <span className="block text-[11px] text-slate-400">{row.detail}</span>}
      </th>
      <td className="py-2 text-right tabular-nums text-navy">{fmtMoney(row.current, currency)}</td>
      <td className="py-2 pl-3">
        <span className="flex items-center justify-end gap-2">
          <span className="hidden h-1.5 w-16 rounded-full bg-slate-100 sm:block" aria-hidden="true">
            <span className="block h-1.5 rounded-full bg-gold" style={{ width: `${Math.min(Math.max(share || 0, 0), 100)}%` }} />
          </span>
          <span className="w-12 text-right text-xs tabular-nums text-slate-500">{fmtPct(share)}</span>
        </span>
      </td>
      {compared && <td className="py-2 pl-3 text-right tabular-nums text-slate-500">{fmtMoney(row.previous, currency)}</td>}
      {compared && (
        <td className="py-2 pl-3 text-right">
          <ChangeCell value={row.current} previous={row.previous} goodWhen={goodWhen} currency={currency} />
        </td>
      )}
    </tr>
  );
}