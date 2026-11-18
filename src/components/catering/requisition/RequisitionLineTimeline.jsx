import React from "react";

const label = (s) => String(s || "").replace(/_/g, " ");

/** Per line: the quantity after each revision that touched it, oldest first. `revisions` must be in order. */
export default function RequisitionLineTimeline({ revisions }) {
  const byLine = new Map();
  for (const r of revisions)
    for (const s of r.line_snapshots || []) {
      if (!s.line_id) continue;
      const entry = byLine.get(s.line_id) || { name: s.inventory_item_name, type: s.line_type, steps: [] };
      entry.steps.push({ rev: r.revision_number, side: r.side, decision: s.decision, qty: s.quantity_after });
      byLine.set(s.line_id, entry);
    }
  if (!byLine.size) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase font-semibold text-muted-foreground">Quantities by round</p>
      <div className="space-y-1.5">
        {[...byLine.entries()].map(([id, l]) => (
          <div key={id} className="text-xs">
            <span className="font-medium">{l.name}</span> <span className="text-muted-foreground capitalize">({l.type})</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {l.steps.map((s, i) => (
                <span key={i} className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                  #{s.rev} {s.side}: <span className="text-foreground">{s.qty == null ? "—" : s.qty}</span> {label(s.decision)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}