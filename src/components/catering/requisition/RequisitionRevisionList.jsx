import React from "react";
import { Badge } from "@/components/ui/badge";

const qty = (v) => (v == null ? "—" : v);

export default function RequisitionRevisionList({ revisions }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase font-semibold text-slate-500">Permit trail ({revisions.length})</p>
      {revisions.map((r) => (
        <div key={r.id} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-900">#{r.revision_number}</span>
            <Badge variant="outline" className="text-xs capitalize">{(r.action || "").replace(/_/g, " ")}</Badge>
            <span className="text-xs text-slate-500">
              {r.side} · {r.actor_name || "—"} · {r.action_date ? new Date(r.action_date).toLocaleString() : ""}
            </span>
          </div>
          {r.comment && <p className="text-xs text-slate-600">{r.comment}</p>}
          {(r.line_snapshots || []).map((s, i) => (
            <div key={i} className="flex justify-between gap-3 text-xs text-slate-600">
              <span>{s.inventory_item_name}{s.reason ? ` · ${s.reason}` : ""}</span>
              <span className="whitespace-nowrap">{qty(s.quantity_before)} → {qty(s.quantity_after)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}