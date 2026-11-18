import React from "react";

/** Per line: what is still left to place across the batches (0 = balanced). */
export default function BatchRemaining({ lines, remaining }) {
  return (
    <div className="rounded-md border border-border p-2 space-y-1">
      <p className="text-xs uppercase font-semibold text-muted-foreground">Remaining to place</p>
      {lines.map((l) => {
        const left = remaining.get(l.id) ?? 0;
        return (
          <div key={l.id} className="flex justify-between gap-3 text-xs">
            <span>{l.inventory_item_name} <span className="text-muted-foreground">(agreed {l.agreed_quantity} {l.unit})</span></span>
            <span className={left === 0 ? "text-success-700" : "text-danger-700 font-medium"}>{left} {l.unit}</span>
          </div>
        );
      })}
    </div>
  );
}