import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { money } from "@/components/finance/customers/customerAccountsApi";
import SortHeader from "@/components/finance/customers/SortHeader";

// One page of suppliers with the Purchases balance beside the ledger balance.
export default function SupplierTable({ items, currency, selected, onToggle, onTogglePage, onOpen, sort, onSort }) {
  const h = { sort, onSort };
  const allOnPage = items.length > 0 && items.every((r) => selected.has(r.supplier_id));
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3"><Checkbox checked={allOnPage} onCheckedChange={onTogglePage} aria-label="Select page" /></th>
            <SortHeader label="Supplier" column="name" align="left" {...h} />
            <SortHeader label="Total invoices" column="invoices" {...h} />
            <SortHeader label="Returns" column="returns" {...h} />
            <SortHeader label="Total spent" column="spent" {...h} />
            <SortHeader label="Cash payments" column="payments" {...h} />
            <SortHeader label="Remaining" column="balance" {...h} />
            <SortHeader label="Not in supplier account" column="unposted" {...h} />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const off = r.unposted_count > 0;
            return (
              <tr key={r.supplier_id} onClick={() => onOpen(r)} className="cursor-pointer border-t hover:bg-slate-50">
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(r.supplier_id)} onCheckedChange={() => onToggle(r.supplier_id)} aria-label={`Select ${r.supplier_name}`} />
                </td>
                <td className="px-3 py-3">
                  <span className="block font-medium text-slate-900" dir="auto">{r.supplier_name}{!r.is_active && <span className="ml-2 text-xs text-slate-400">inactive</span>}</span>
                  <span className="block text-xs text-slate-400">{r.phone}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{money(r.total_invoices, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">{money(r.total_returns, currency)}</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">{money(r.total_spent, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{money(r.total_payments, currency)}</td>
                <td className={`px-3 py-3 text-right font-semibold tabular-nums ${r.balance > 0.005 ? "text-amber-700" : "text-slate-500"}`}>{money(r.balance, currency)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${off ? "text-red-600" : "text-slate-500"}`} title={off ? `${r.unposted_count} Purchases invoice(s) in this scope not registered in the supplier account` : "Every Purchases invoice in this scope is in the supplier account"}>
                  {off ? <><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{money(r.unposted_amount, currency)} <span className="text-xs">({r.unposted_count})</span></> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}