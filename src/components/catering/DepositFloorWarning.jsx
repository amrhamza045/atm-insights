import React from "react";
import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function DepositFloorWarning({ warning, confirmed, onConfirmedChange, actionLabel = "issue the credit note" }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2 text-sm text-amber-900">
      <div className="flex gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          This leaves {formatCurrency(warning.projected_deposit, true)} on deposit — {formatCurrency(warning.shortfall, true)} below
          the required {formatCurrency(warning.required_deposit, true)}. The event will move back to <b>deposit pending</b>.
        </p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={confirmed} onCheckedChange={(v) => onConfirmedChange(!!v)} />
        I understand — {actionLabel} anyway
      </label>
    </div>
  );
}