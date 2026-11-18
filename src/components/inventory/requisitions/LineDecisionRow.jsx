import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Check, Lock } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { isUncosted, uncostedLabel } from "@/components/catering/requisition/lineCosting";
import { canConfirmEdit, isOverExtra } from "./replyRules";

const CHOICES = [
  { key: "confirmed", label: "Confirm", on: "bg-success-600 text-white" },
  { key: "edited", label: "Edit", on: "bg-warning-600 text-white" },
  { key: "declined", label: "Decline", on: "bg-danger-600 text-white" },
];

/** One active line in Inventory's reply: Confirm / Edit (qty + reason + confirm edit) / Decline (reason). */
export default function LineDecisionRow({ line: l, stock, decision: d, onChange, editable, overStock }) {
  const set = (patch) => onChange({ ...(d || {}), ...patch });
  const isEdited = d?.decision === "edited";
  const editedQty = isEdited && Number(d?.agreed_quantity) > 0 ? Number(d.agreed_quantity) : null;
  const displayQty = editedQty !== null ? editedQty : Number(l.requested_quantity) || 0;
  const readyToConfirmEdit = canConfirmEdit(l, d);
  const editConfirmed = isEdited && d?.edit_confirmed === true && readyToConfirmEdit;

  return (
    <tr className="align-top">
      <td className="py-2 pr-3"><Badge variant="outline" className="text-xs capitalize">{l.line_type}</Badge></td>
      <td className="py-2 pr-3">
        <span className="text-slate-800">{l.inventory_item_name}</span>
        {l.chef_response === "countered" && !l.is_agreed && <Badge variant="outline" className="text-xs ml-1">Chef countered</Badge>}
        {l.chef_comment && <span className="block text-xs text-slate-500">{l.chef_comment}</span>}
      </td>
      <td className="py-2 pr-3 text-right">
        {editedQty !== null && editedQty !== Number(l.requested_quantity) ? (
          <div>
            <span className="font-semibold text-warning-700">{editedQty}</span> <span className="text-slate-500">{l.unit}</span>
            <span className="block text-xs text-slate-400 line-through">Req: {l.requested_quantity} {l.unit}</span>
            {l.system_minimum_quantity != null && (
              <span className="block text-[11px] text-slate-500">Sys min: {l.system_minimum_quantity} {l.unit}</span>
            )}
          </div>
        ) : (
          <div>
            <span>{l.requested_quantity} <span className="text-slate-500">{l.unit}</span></span>
            {l.system_minimum_quantity != null && (
              <span className="block text-[11px] text-slate-500">Sys min: {l.system_minimum_quantity} {l.unit}</span>
            )}
          </div>
        )}
      </td>
      <td className="py-2 pr-3 text-right">
        {isUncosted(l) ? (
          <Badge className="text-xs bg-warning-100 text-warning-800 hover:bg-warning-100 shadow-none">{uncostedLabel(l)}</Badge>
        ) : (
          <div>
            <span className={editedQty !== null && editedQty !== Number(l.requested_quantity) ? "font-semibold text-warning-700" : ""}>
              {formatCurrency(displayQty * Number(l.estimated_unit_cost))}
            </span>
            {editedQty !== null && editedQty !== Number(l.requested_quantity) && (
              <span className="block text-xs text-slate-400 line-through">
                {formatCurrency((Number(l.requested_quantity) || 0) * Number(l.estimated_unit_cost))}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="py-2 pr-3 text-right">{stock ? stock.free : "—"}</td>
      <td className="py-2 space-y-1.5 min-w-56">
        {editable ? (
          <>
            <div className="flex gap-1">
              {CHOICES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => set({ decision: c.key, ...(c.key !== "edited" ? { edit_confirmed: false } : {}) })}
                  className={`px-2 py-1 rounded text-xs border border-slate-200 ${d?.decision === c.key ? c.on : "bg-white text-slate-700"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {isEdited && (
              <Input
                type="number"
                min="0"
                step="any"
                className="h-8"
                placeholder="Agreed qty"
                value={d.agreed_quantity ?? ""}
                onChange={(e) => set({ agreed_quantity: e.target.value, edit_confirmed: false })}
              />
            )}
            {isOverExtra(l, d) && <p className="text-xs text-danger-700">An extra can't be agreed above the chef's requested {l.requested_quantity}</p>}
            {(isEdited || d?.decision === "declined") && (
              <Input
                className="h-8"
                placeholder="Reason (required)"
                value={d.reason || ""}
                onChange={(e) => set({ reason: e.target.value, ...(isEdited ? { edit_confirmed: false } : {}) })}
              />
            )}
            {isEdited && (
              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={editConfirmed ? "default" : "outline"}
                  disabled={!readyToConfirmEdit}
                  onClick={() => set({ edit_confirmed: true })}
                  className={`h-7 text-xs gap-1 ${editConfirmed ? "bg-success-600 hover:bg-success-700 text-white" : ""}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {editConfirmed ? "Edit confirmed" : "Confirm edit"}
                </Button>
                {!editConfirmed && (
                  <span className="text-xs text-slate-500">
                    {readyToConfirmEdit ? "Click to confirm edited quantity" : "Enter a new qty & reason"}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs capitalize inline-flex items-center gap-1">{l.is_agreed && <Lock className="w-3.5 h-3.5" />}{l.is_agreed ? "Agreed · " : ""}{l.inventory_decision || "pending"}{l.agreed_quantity != null ? ` · ${l.agreed_quantity} ${l.unit}` : ""}{l.decision_reason ? ` · ${l.decision_reason}` : ""}</span>
        )}
        {overStock && <p className="text-xs text-danger-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> More than the free stock</p>}
      </td>
    </tr>
  );
}