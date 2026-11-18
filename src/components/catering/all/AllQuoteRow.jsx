import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import OpenEventButton from "./OpenEventButton";

const STATUS = {
  active: ["Active", "bg-emerald-100 text-emerald-700"],
  pending_approval: ["Awaiting approval", "bg-amber-100 text-amber-800"],
  accepted: ["Accepted", "bg-blue-100 text-blue-700"],
  superseded: ["Superseded", "bg-slate-100 text-slate-600"],
  rejected: ["Rejected", "bg-red-100 text-red-700"],
};

/** One quote in the all-events Quotes list. */
export default function AllQuoteRow({ quote: q, packageName }) {
  const [label, tone] = STATUS[q.status] || [q.status, "bg-slate-100 text-slate-600"];
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{q.event_name}</p>
        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
          <FileText className="w-3.5 h-3.5" /> Quote {q.revision_number}
          {q.variant_label && <Badge variant="secondary" className="text-xs">{q.variant_label}</Badge>}
          {packageName && <Badge variant="outline" className="text-xs">{packageName}</Badge>}
          <span>· {q.client_name || "—"} · {q.created_date ? new Date(q.created_date).toLocaleDateString() : "—"}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={tone}>{label}</Badge>
        <div className="text-right">
          <p className="font-semibold text-slate-900">{formatCurrency(q.total || 0)}</p>
          <p className="text-xs text-slate-500">Deposit {formatCurrency(q.required_deposit || 0)}</p>
        </div>
        <OpenEventButton tab="quotes" eventId={q.event_id} />
      </div>
    </div>
  );
}