import React from "react";
import { AlertTriangle } from "lucide-react";

export const overBy = (received, ordered) => {
  const r = Number(received) || 0;
  const o = Number(ordered) || 0;
  return o > 0 && r > o ? Math.round((r - o) * 100) / 100 : 0;
};

export function OverReceiptLine({ received, ordered, unit = "" }) {
  const n = overBy(received, ordered);
  if (!n) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      Received {received} vs ordered {ordered} — this is {n} {unit} more than ordered
    </p>
  );
}

export function OverReceiptConfirm({ count, checked, onChange }) {
  if (!count) return null;
  return (
    <label className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        {count} line{count > 1 ? "s" : ""} received more than ordered. I've checked the quantities and confirm this over-receipt.
      </span>
    </label>
  );
}