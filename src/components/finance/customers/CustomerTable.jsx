import { Checkbox } from "@/components/ui/checkbox";
import { money } from "./customerAccountsApi";
import SortHeader from "./SortHeader";

// One page of customers; ticking selects for export, clicking a row opens it.
export default function CustomerTable({ items, currency, selected, onToggle, onTogglePage, onOpen, sort, onSort }) {
  const h = { sort, onSort };
  const allOnPage = items.length > 0 && items.every((r) => selected.has(r.client_id));
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3"><Checkbox checked={allOnPage} onCheckedChange={onTogglePage} aria-label="Select page" /></th>
            <SortHeader label="Customer" column="name" align="left" {...h} />
            <SortHeader label="Events" column="events" {...h} />
            <SortHeader label="Total quotation" column="quoted" {...h} />
            <SortHeader label="Total paid" column="paid" {...h} />
            <SortHeader label="Remaining" column="balance" {...h} />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.client_id} onClick={() => onOpen(r)} className="cursor-pointer border-t hover:bg-slate-50">
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.has(r.client_id)} onCheckedChange={() => onToggle(r.client_id)} aria-label={`Select ${r.client_name}`} />
              </td>
              <td className="px-3 py-3">
                <span className="block font-medium text-slate-900" dir="auto">{r.client_name}</span>
                <span className="block text-xs text-slate-400">{[r.client_phone, r.last_activity_date && `Last activity ${r.last_activity_date}`].filter(Boolean).join(" · ")}</span>
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{r.event_count}</td>
              <td className="px-3 py-3 text-right tabular-nums">{money(r.total_quoted, currency)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{money(r.total_paid, currency)}</td>
              <td className={`px-3 py-3 text-right font-semibold tabular-nums ${r.balance > 0.005 ? "text-amber-700" : "text-slate-500"}`}>{money(r.balance, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}