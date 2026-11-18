import React from "react";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

// Money the customer paid while the event has no live quote: the company owes it until a new quote uses it.
export default function DepositCreditNotice({ event }) {
  const paid = Number(event?.total_paid) || 0;
  if (paid <= 0 || event.active_quote_id || event.status === "cancelled") return null;
  return (
    <Card className="p-3 border-blue-200 bg-blue-50 text-sm text-blue-900 flex items-start gap-2">
      <Wallet className="w-4 h-4 mt-0.5" />
      <span>
        <span className="font-semibold">Customer credit: {formatCurrency(paid, true)}</span> paid on this event with no live quote.
        It counts toward the next quote. If the event is cancelled, it pays the cancellation fee first and any surplus is refunded.
      </span>
    </Card>
  );
}