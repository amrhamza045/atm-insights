import React from "react";
import { Badge } from "@/components/ui/badge";
import RequisitionLineTimeline from "./RequisitionLineTimeline";
import ApprovalBasis from "./ApprovalBasis";
import RevisionPlans from "./batches/RevisionPlans";

const APPROVAL_ACTIONS = ["approval_requested", "approved", "rejected", "submitted", "countered"];

const qty = (v) => (v == null ? "—" : v);
const label = (s) => String(s || "").replace(/_/g, " ");

/** Every revision in order (oldest first) with its per-line changes, then a per-line quantity timeline. */
export default function RequisitionHistory({ revisions }) {
  const ordered = [...revisions].sort((a, b) => (a.revision_number || 0) - (b.revision_number || 0));
  if (!ordered.length) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <div className="space-y-5">
      <RequisitionLineTimeline revisions={ordered} />
      <div className="space-y-2">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Revisions ({ordered.length})</p>
        {ordered.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">#{r.revision_number}</span>
              <Badge variant="outline" className="text-xs capitalize">{label(r.action)}</Badge>
              <span className="text-xs text-muted-foreground">
                {r.side} · {r.actor_name || "—"} · {r.action_date ? new Date(r.action_date).toLocaleString() : ""}
              </span>
            </div>
            {r.comment && <p className="text-xs">“{r.comment}”</p>}
            {r.approval_reason && <p className="text-xs text-warning-800">{r.approval_reason}</p>}
            {APPROVAL_ACTIONS.includes(r.action) && <ApprovalBasis values={r} />}
            <RevisionPlans revision={r} />
            {(r.line_snapshots || []).map((s, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  <span className="text-foreground">{s.inventory_item_name}</span>
                  {s.decision ? ` · ${label(s.decision)}` : ""}{s.reason ? ` · ${s.reason}` : ""}{s.comment ? ` · “${s.comment}”` : ""}
                </span>
                <span className="whitespace-nowrap">{qty(s.quantity_before)} → {qty(s.quantity_after)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}