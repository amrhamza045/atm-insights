import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { dueLabel } from "@/components/inventory/requisitions/useDueBatches";

const STATUS_CLASS = {
  scheduled: "bg-sky-100 text-sky-800", proposed: "bg-warning-100 text-warning-800",
  released: "bg-success-100 text-success-800", received: "bg-success-200 text-success-900", void: "bg-muted text-muted-foreground",
};

/** One batch plan: each batch's number, date, status and line quantities (released: batch qty → actual). */
export default function BatchPlanView({ title, plan, proposed = false, actions, highlightDue = false }) {
  const today = companyToday();
  return (
    <div className="space-y-2 min-w-0">
      {title && <p className="text-xs uppercase font-semibold text-muted-foreground">{title}</p>}
      {!plan.length && <p className="text-sm text-muted-foreground">No batches.</p>}
      {plan.map((b, i) => {
        const status = proposed ? "proposed" : b.status || "scheduled";
        const issued = status === "released" || status === "received";
        const due = highlightDue && status === "scheduled" && b.needed_by_date && b.needed_by_date <= today;
        return (
          <div key={b.slip_id || i} className={`rounded-lg border p-3 space-y-1.5 ${due ? "border-danger-300 bg-danger-50" : "border-border"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-sm">
                {b.batch_number ? `Batch ${b.batch_number}` : "New batch"}
                {b.slip_number && <span className="text-xs text-muted-foreground"> · {b.slip_number}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{b.needed_by_date}</span>
                {due && <Badge className="bg-danger-100 text-danger-800 hover:bg-danger-100 capitalize">{dueLabel(b.needed_by_date, today)}</Badge>}
                <Badge className={`${STATUS_CLASS[status] || STATUS_CLASS.scheduled} capitalize`}>{status}</Badge>
              </span>
            </div>
            {b.lines.map((x) => (
              <div key={x.line_id} className="flex justify-between gap-3 text-xs">
                <span>{x.inventory_item_name}</span>
                <span className="whitespace-nowrap">
                  {issued && x.actual_quantity !== undefined && x.actual_quantity !== x.quantity
                    ? <>{x.quantity} → <span className="font-medium text-warning-700">{x.actual_quantity}</span> {x.unit}</>
                    : <>{issued && x.actual_quantity !== undefined ? x.actual_quantity : x.quantity} {x.unit}</>}
                </span>
              </div>
            ))}
            {issued && b.released_date && (
              <p className="text-xs text-muted-foreground">Released by {b.released_by} · {new Date(b.released_date).toLocaleString()}</p>
            )}
            {status === "received" && (
              <p className="text-xs text-muted-foreground">Received by {b.received_by} · {new Date(b.received_date).toLocaleString()}{b.receipt_comment ? ` — “${b.receipt_comment}”` : ""}</p>
            )}
            {actions?.(b)}
          </div>
        );
      })}
    </div>
  );
}