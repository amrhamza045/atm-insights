import { money } from "@/components/finance/customers/customerAccountsApi";

// A supplier's dated ledger entries with a running balance.
export default function SupplierLedgerTable({ entries }) {
  if (!entries.length) return <p className="rounded-lg border p-4 text-center text-sm text-slate-500">No posted ledger entries in the selected filters.</p>;
  let run = 0;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Entry</th><th className="px-3 py-2 text-right">Invoice (credit)</th><th className="px-3 py-2 text-right">Payment (debit)</th><th className="px-3 py-2 text-right">Balance</th></tr>
        </thead>
        <tbody>
          {entries.map((x, i) => {
            run += x.invoice - x.payment;
            return (
              <tr key={i} className="border-t">
                <td className="w-28 px-3 py-2 text-xs text-slate-500">{x.date}</td>
                <td className="px-3 py-2">{x.label}{x.reference && <span className="block text-xs text-slate-400">{x.reference}</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums">{x.invoice ? money(x.invoice) : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{x.payment ? money(x.payment) : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{money(run)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}