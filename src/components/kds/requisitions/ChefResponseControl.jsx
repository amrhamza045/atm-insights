import React from "react";
import { Input } from "@/components/ui/input";

/** Chef's answer to one edited / declined line: Accept, or Counter with a new qty and a required comment. */
export default function ChefResponseControl({ line: l, value: v, onChange }) {
  const set = (patch) => onChange({ ...(v || {}), ...patch });
  const btn = (key, text, on) => (
    <button type="button" onClick={() => set({ response: key })}
      className={`px-2 py-1 rounded text-xs border border-border ${v?.response === key ? on : "bg-background text-foreground"}`}>{text}</button>
  );
  return (
    <div className="space-y-1.5 min-w-52 text-left">
      <div className="flex gap-1 justify-end">
        {btn("accepted", l.inventory_decision === "declined" ? "Accept decline" : "Accept", "bg-success-600 text-white")}
        {btn("countered", "Counter", "bg-warning-600 text-white")}
      </div>
      {v?.response === "countered" && (
        <>
          <Input type="number" min="0" step="any" className="h-8" placeholder={`Counter qty (${l.unit || "unit"})`} value={v.quantity ?? ""} onChange={(e) => set({ quantity: e.target.value })} />
          <Input className="h-8" placeholder="Comment (required)" value={v.comment || ""} onChange={(e) => set({ comment: e.target.value })} />
        </>
      )}
    </div>
  );
}

/** Mirrors the server rules (respondRequisition); the server re-checks everything. */
export function responseComplete(line, v) {
  if (!v) return false;
  if (v.response === "accepted") return true;
  const qty = Number(v.quantity);
  return v.response === "countered" && qty > 0 && !!String(v.comment || "").trim()
    && !(line.inventory_decision === "edited" && Math.abs(qty - Number(line.agreed_quantity)) < 1e-9);
}