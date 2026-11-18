import React from "react";
import { HandCoins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentPoliciesHeader({ canEdit, onAdd }) {
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <HandCoins className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">Payment policies</h2>
          <p className="mt-0.5 text-sm text-slate-500 max-w-2xl">
            Set what a client pays, when it's due and whether the booking needs approval, based on how far ahead the event is booked.
            Days ahead are counted from the day the event is requested to the event date.
          </p>
        </div>
      </div>
      {canEdit && (
        <Button onClick={onAdd} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0">
          <Plus className="w-4 h-4" /> New policy
        </Button>
      )}
    </div>
  );
}