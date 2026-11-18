import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Percentage of the full event total. It fills the deposit's Amount and sets its minimum: the amount can be raised above it, not lowered below. */
export default function DepositPercentField({ value, onChange, paidPct, requiredPct, paidAmount = 0, requiredAmount = 0 }) {
  return (
    <div>
      <Label>Percentage of quote total</Label>
      <div className="flex items-center gap-3 mt-1">
      <div className="relative w-32">
        <Input
          type="number" min="0" max="100" value={value}
          onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          className="h-12 text-xl pr-10 rounded-xl"
        />
        <span className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-8 rounded-lg text-lg bg-slate-900 text-white flex items-center justify-center pointer-events-none">%</span>
      </div>
      <div className="text-sm text-slate-600 leading-tight">
        <div>Paid so far: <strong className={paidAmount >= requiredAmount ? "text-green-600" : "text-red-600"}>{Number(paidAmount).toLocaleString("en-US", { maximumFractionDigits: 2 })} ({paidPct}%)</strong></div>
        <div>Required deposit: <strong>{Number(requiredAmount).toLocaleString("en-US", { maximumFractionDigits: 2 })} ({requiredPct}%)</strong></div>
      </div>
      </div>
    </div>
  );
}