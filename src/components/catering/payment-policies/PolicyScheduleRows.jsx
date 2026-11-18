import React from "react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const STATES = {
  paid: ["Paid", "bg-emerald-100 text-emerald-700"],
  overdue: ["Overdue", "bg-red-100 text-red-700"],
  today: ["Due today", "bg-amber-100 text-amber-800"],
  upcoming: ["Upcoming", "bg-slate-100 text-slate-600"],
};
const stateOf = (step, totalPaid, today) =>
  totalPaid + 0.005 >= step.required_by_then ? "paid"
    : step.due_date < today ? "overdue" : step.due_date === today ? "today" : "upcoming";

/** Each payment step: when it is due, the total to have paid by then, and where the event stands. */
export default function PolicyScheduleRows({ steps, totalPaid, today, priced }) {
  if (!steps.length) return <p className="text-sm text-slate-500">This policy has no payment steps.</p>;
  return (
    <div className="rounded-lg border divide-y">
      {steps.map((step, i) => {
        const [label, cls] = STATES[stateOf(step, totalPaid, today)];
        return (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-800">{i + 1}. {step.label || (step.amount_type === "balance" ? "Remaining balance" : "Payment")}</p>
              <p className="text-xs text-slate-500">Due by {step.due_date}{priced ? ` · ${formatCurrency(step.required_by_then, true)} paid in total by then` : ""}</p>
            </div>
            {priced && <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>}
          </div>
        );
      })}
      <div className="flex justify-between px-3 py-2 text-xs text-slate-500">
        <span>{priced ? "Paid so far" : "Amounts follow once the event has a quote"}</span>
        {priced && <span className="font-medium text-slate-800">{formatCurrency(totalPaid, true)}</span>}
      </div>
    </div>
  );
}