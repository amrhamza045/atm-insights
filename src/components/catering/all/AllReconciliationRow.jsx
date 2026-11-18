import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import OpenEventButton from "./OpenEventButton";

/** One event's reconciliation in the all-events list. */
export default function AllReconciliationRow({ rec: r }) {
  const finalized = r.status === "finalized";
  const actual = Number(r.actual_guests) || 0;
  const expected = Number(r.expected_guests) || 0;
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{r.event_name}</p>
        <p className="text-xs text-slate-500">
          {r.event_date || "—"} · {r.client_name || "—"} · {actual > 0 ? `${actual} of ${expected} guests attended` : `${expected} guests expected`}
          {finalized && r.finalized_by ? ` · finalized by ${r.finalized_by}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={finalized ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>
          {finalized ? "Finalized" : "Open"}
        </Badge>
        <div className="text-right">
          <p className="font-semibold text-slate-900">{formatCurrency(r.final_billing_total || 0)}</p>
          <p className="text-xs text-slate-500">Balance due {formatCurrency(r.final_balance_due || 0)}</p>
        </div>
        <OpenEventButton tab="reconciliation" eventId={r.event_id} />
      </div>
    </div>
  );
}