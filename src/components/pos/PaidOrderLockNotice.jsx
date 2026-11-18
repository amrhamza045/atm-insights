import React from "react";
import { Lock } from "lucide-react";

export default function PaidOrderLockNotice() {
  return (
    <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex gap-2 items-start">
      <Lock className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-slate-700">
        <p className="font-semibold">Order paid — table closed</p>
        <p>This order is locked. Only a manager or restaurant manager can edit or delete it.</p>
      </div>
    </div>
  );
}