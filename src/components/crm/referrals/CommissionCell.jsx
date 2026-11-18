import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

// The referral's commissions, one per event the referred client booked. onOpen(null) adds one;
// without onOpen (no "Edit financial records") the commissions are shown read-only.
export default function CommissionCell({ referral, commissions, onOpen }) {
  const converted = referral.status === "converted";
  if (!converted && commissions.length === 0) {
    return <span className="text-xs text-slate-400">Recorded once converted</span>;
  }
  if (!onOpen && commissions.length === 0) {
    return <span className="text-xs text-slate-400">No commission recorded</span>;
  }
  const Row = onOpen ? "button" : "div";
  return (
    <div className="space-y-1.5">
      {commissions.map((c) => (
        <Row
          key={c.id}
          {...(onOpen ? { type: "button", onClick: () => onOpen(c) } : {})}
          className={`w-full text-left rounded-md border border-slate-200 px-2 py-1.5 ${onOpen ? "hover:bg-slate-50" : ""}`}
        >
          <span className="block text-xs font-medium text-slate-900 truncate">{c.event_name || "Event"}</span>
          <span className="flex items-center justify-between gap-2 text-xs text-slate-600">
            {formatCurrency(c.amount, true)}
            <Badge className={c.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
              {c.status === "paid" ? "Paid" : "Unpaid"}
            </Badge>
          </span>
        </Row>
      ))}
      {converted && onOpen && (
        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => onOpen(null)}>
          <Plus className="w-3.5 h-3.5" /> Add commission
        </Button>
      )}
    </div>
  );
}