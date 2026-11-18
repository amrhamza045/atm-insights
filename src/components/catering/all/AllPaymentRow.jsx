import React from "react";
import { Badge } from "@/components/ui/badge";
import ReceiptLink from "@/components/shared/ReceiptLink";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { OUTFLOWS } from "@/components/catering/retainedFunds";
import OpenEventButton from "./OpenEventButton";

const STATUS = {
  pending: ["Awaiting approval", "bg-amber-100 text-amber-800"],
  completed: ["Completed", "bg-emerald-100 text-emerald-700"],
  voided: ["Voided", "bg-slate-200 text-slate-700"],
  rejected: ["Rejected", "bg-red-100 text-red-700"],
  refunded: ["Refunded", "bg-blue-100 text-blue-700"],
};
const words = (v) => (v || "—").replace(/_/g, " ");

/** One payment in the all-events Deposits & Payments list. */
export default function AllPaymentRow({ payment: p }) {
  const [label, tone] = STATUS[p.status] || [p.status, "bg-slate-100 text-slate-600"];
  const amountTone = ["voided", "rejected"].includes(p.status) ? "line-through text-slate-400"
    : p.status === "pending" ? "text-slate-500"
    : OUTFLOWS.includes(p.payment_type) ? "text-red-600" : "text-emerald-600";
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{p.event_name}</p>
        <p className="text-xs text-slate-500 capitalize">
          {words(p.payment_type)} · {words(p.payment_method)} · {p.payment_date ? new Date(p.payment_date).toLocaleString() : "—"}
        </p>
        <p className="text-xs text-slate-500">
          {p.recorded_by || "—"}{p.reference ? ` · Ref ${p.reference}` : ""}{" "}
          <ReceiptLink value={p.receipt_url} className="text-xs text-blue-600 underline">View proof</ReceiptLink>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={tone}>{label}</Badge>
        <span className={`font-semibold ${amountTone}`}>{formatCurrency(p.amount)}</span>
        <OpenEventButton tab="payments" eventId={p.event_id} />
      </div>
    </div>
  );
}