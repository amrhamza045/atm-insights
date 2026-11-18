import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Lock } from "lucide-react";
import { isUncosted, uncostedLabel } from "./lineCosting";

const lineCost = (l) => (Number(l.requested_quantity) || 0) * Number(l.estimated_unit_cost);
const DECISION_CLASS = {
  confirmed: "bg-success-100 text-success-800", edited: "bg-warning-100 text-warning-800", declined: "bg-danger-100 text-danger-800",
};
const decided = (l) => l.inventory_decision && l.inventory_decision !== "pending";

/** Requisition lines. Inventory's decision columns appear once any line has one; renderActions adds a last column. */
export default function RequisitionLinesTable({ lines, inactiveCount, emptyText, renderActions }) {
  const inactiveNote = inactiveCount > 0 && (
    <p className="text-xs text-muted-foreground mt-1">{inactiveCount} inactive line(s) are kept for the record.</p>
  );
  if (!lines.length) return <div><p className="text-sm text-muted-foreground">{emptyText || "No active lines."}</p>{inactiveNote}</div>;
  const showDecisions = lines.some((l) => decided(l) || l.chef_response === "countered");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="py-1.5 pr-3 font-medium">Type</th>
            <th className="py-1.5 pr-3 font-medium">Item</th>
            <th className="py-1.5 pr-3 font-medium text-right">Qty</th>
            <th className="py-1.5 pr-3 font-medium">Unit</th>
            <th className="py-1.5 pr-3 font-medium text-right">Est. cost</th>
            {showDecisions && <th className="py-1.5 pr-3 font-medium">Inventory</th>}
            {renderActions && <th className="py-1.5 font-medium" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="py-1.5 pr-3"><Badge variant="outline" className="text-xs capitalize">{l.line_type}</Badge></td>
              <td className="py-1.5 pr-3">
                <span>{l.inventory_item_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {(l.purpose || "").replace(/_/g, " ")}{l.produced_item_name ? ` · for ${l.produced_item_name}` : ""}{l.chef_comment ? ` · ${l.chef_comment}` : ""}
                </span>
              </td>
              <td className="py-1.5 pr-3 text-right">
                <span>{l.requested_quantity}</span>
                {l.system_minimum_quantity != null && (
                  <span className="block text-[11px] text-muted-foreground">
                    Sys min: {l.system_minimum_quantity}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-3 text-muted-foreground">{l.unit || "—"}</td>
              <td className="py-1.5 pr-3 text-right">
                {isUncosted(l) ? (
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <Badge className="text-xs bg-warning-100 text-warning-800 hover:bg-warning-100 shadow-none">{uncostedLabel(l)}</Badge>
                    <span className="text-xs text-muted-foreground max-w-64 text-right">{l.uncosted_reason || "No comparable cost for this unit"}</span>
                  </span>
                ) : formatCurrency(lineCost(l))}
              </td>
              {showDecisions && (
                <td className="py-1.5 pr-3">
                  {l.chef_response === "countered" && !decided(l) ? (
                    <span className="inline-flex flex-col gap-0.5">
                      <Badge variant="outline" className="text-xs w-fit">Countered · awaiting Inventory</Badge>
                    </span>
                  ) : decided(l) ? (
                    <span className="inline-flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Badge className={`text-xs capitalize shadow-none w-fit ${DECISION_CLASS[l.inventory_decision] || ""}`}>{l.inventory_decision}</Badge>
                        {l.is_agreed === true && <Badge variant="outline" className="text-xs gap-1"><Lock className="w-3 h-3" /> Agreed</Badge>}
                      </span>
                      {l.agreed_quantity != null && <span className="text-xs">Agreed {l.agreed_quantity} {l.unit}</span>}
                      {l.decision_reason && <span className="text-xs text-muted-foreground">{l.decision_reason}</span>}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">Pending</span>}
                </td>
              )}
              {renderActions && <td className="py-1.5 text-right whitespace-nowrap">{renderActions(l)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {inactiveNote}
    </div>
  );
}