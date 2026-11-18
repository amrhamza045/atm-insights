import { money } from "./customerAccountsApi";

const CUSTOMER = [["total_quoted", "Total quotation (debit)"], ["total_paid", "Total payments (credit)"], ["balance", "Total remaining (balance)"]];

// The three headline totals for the current filters (labels/keys overridable).
export default function CustomerTotals({ totals, count, currency, fields = CUSTOMER, noun = "customer" }) {
  const tone = { total_paid: "text-emerald-700", total_payments: "text-emerald-700", balance: (totals?.balance || 0) > 0 ? "text-amber-700" : "text-slate-900" };
  return (
    <div className={`grid gap-3 sm:grid-cols-3 ${fields.length > 3 ? "lg:grid-cols-5" : ""}`}>
      {fields.map(([key, label]) => (
        <div key={key} className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone[key] || "text-slate-900"}`}>{totals ? money(totals[key], currency) : "—"}</p>
          <p className="mt-1 text-xs text-slate-400">{count ?? 0} {noun}(s)</p>
        </div>
      ))}
    </div>
  );
}