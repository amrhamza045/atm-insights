import React from "react";
import { CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentPoliciesEmpty({ canEdit, onAdd }) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-6 py-14 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
        <CalendarRange className="w-6 h-6 text-amber-500" />
      </div>
      <p className="mt-4 font-medium text-slate-900">No payment policies yet</p>
      <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
        Add one policy per booking window, starting at 0 days and ending with one that has no upper limit, so every booking matches exactly one policy.
      </p>
      {canEdit && (
        <Button onClick={onAdd} className="mt-5 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="w-4 h-4" /> Add the first policy
        </Button>
      )}
    </div>
  );
}