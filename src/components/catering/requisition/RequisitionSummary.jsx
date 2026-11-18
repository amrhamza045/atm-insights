import React from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, CalendarClock } from "lucide-react";
import { dueLabel } from "@/components/inventory/requisitions/useDueBatches";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { AWAITING_LABEL, statusLabel, countsText } from "./requisitionApi";

/** One requisition card inside the grouped stage board or standalone list. */
export default function RequisitionSummary({
  requisition: r,
  onOpen,
  dueBatches = [],
  today,
  urgent = false,
  showEventName = true,
  inBoard = false,
}) {
  if (!inBoard) {
    return (
      <button type="button" onClick={onOpen} className={`w-full text-left rounded-lg border bg-card text-card-foreground p-3 hover:bg-accent hover:text-accent-foreground transition-colors space-y-1 ${dueBatches.length ? "border-danger-300 ring-1 ring-danger-200" : "border-border"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold inline-flex items-center gap-1.5">
            {r.requisition_number}
            {r.is_additional ? (
              <Badge className="text-[10px] bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                Additional #{r.requisition_sequence || 2}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Primary #1</Badge>
            )}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="capitalize">{statusLabel(r.status)}</Badge>
            <Badge variant="secondary">{AWAITING_LABEL[r.awaiting_side] || "—"}</Badge>
            {r.status === "pending_approval" && <Badge className="gap-1 bg-warning-100 text-warning-800 hover:bg-warning-100"><Lock className="w-3 h-3" /> Waiting for approval</Badge>}
            {r.approval_status === "rejected" && r.awaiting_side === "chef" && <Badge className="bg-danger-100 text-danger-800 hover:bg-danger-100">Approval rejected</Badge>}
          </div>
        </div>
        <p className="text-sm">{r.event_name || "—"} · {r.event_date || "no date"}</p>
        {dueBatches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dueBatches.map((s) => (
              <Badge key={s.id} className="gap-1 bg-danger-100 text-danger-800 hover:bg-danger-100">
                <CalendarClock className="w-3 h-3" /> Batch {s.batch_number} {dueLabel(s.needed_by_date, today)}{s.needed_by_date !== today ? ` · ${s.needed_by_date}` : ""}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Revision {r.current_revision || 0} · {countsText(r.line_counts)} · {r.uncosted_line_count || 0} uncosted · Extras est. {formatCurrency(r.extras_estimated_cost)}
        </p>
      </button>
    );
  }

  const isUrgent = urgent || dueBatches.length > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`req-card ${isUrgent ? "req-urgent" : ""}`}
    >
      <div className="req-top">
        <span className="req-number">{r.requisition_number}</span>
        <div className="req-badges">
          <span className="req-badge">
            {r.is_additional ? `Additional #${r.requisition_sequence || 2}` : "Primary #1"}
          </span>
          <span className="req-badge capitalize">{statusLabel(r.status)}</span>
          <span className="req-badge req-green">{AWAITING_LABEL[r.awaiting_side] || "—"}</span>
          {r.status === "pending_approval" && (
            <span className="req-badge">
              <Lock className="w-3 h-3" /> Waiting for approval
            </span>
          )}
          {r.approval_status === "rejected" && r.awaiting_side === "chef" && (
            <span className="req-badge">Approval rejected</span>
          )}
        </div>
      </div>
      <div className="req-event">
        {showEventName ? (
          <>
            {r.event_name || "—"} <span className="req-date">· {r.event_date || "no date"}</span>
          </>
        ) : (
          r.event_date || "no date"
        )}
      </div>
      {dueBatches.length > 0 && (
        <div className="req-badges" style={{ justifyContent: "flex-start" }}>
          {dueBatches.map((s) => (
            <span key={s.id} className="req-badge">
              <CalendarClock className="w-3 h-3" /> Batch {s.batch_number} {dueLabel(s.needed_by_date, today)}
              {s.needed_by_date !== today ? ` · ${s.needed_by_date}` : ""}
            </span>
          ))}
        </div>
      )}
      <div className="req-meta">
        Revision {r.current_revision || 0} · {countsText(r.line_counts)} · {r.uncosted_line_count || 0} uncosted · Extras est. {formatCurrency(r.extras_estimated_cost)}
      </div>
    </button>
  );
}