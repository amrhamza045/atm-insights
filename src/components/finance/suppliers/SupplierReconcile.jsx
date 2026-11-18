import { money } from "@/components/finance/customers/customerAccountsApi";

// Purchases invoices in the selected branch/company and dates that were never posted to this supplier's account.
export default function SupplierReconcile({ s, currency }) {
  if (!s.unposted_count) return <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Every Purchases invoice for this supplier in the selected scope is posted to the account.</p>;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
      <p className="mb-2 font-medium text-red-800">{s.unposted_count} Purchases invoice(s) not registered in this supplier account · {money(s.unposted_amount, currency)}</p>
      {s.unposted.map((i, n) => (
        <p key={n} className="flex justify-between gap-2"><span>{i.invoice_date} · #{i.invoice_number}{i.branch_name && <span className="text-slate-500"> · {i.branch_name}</span>}</span><span className="tabular-nums">{money(i.amount)}</span></p>
      ))}
      <p className="mt-2 text-xs text-slate-600">These are marked posted in Purchases (stock was received) but have no supplier-account entry, so they are not in the totals above. Register them from Purchases › Suppliers › account with their real paid/unpaid evidence, or cover them with an opening balance.</p>
    </div>
  );
}