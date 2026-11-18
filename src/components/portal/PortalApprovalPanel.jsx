import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/**
 * Customer approval of the whole booking — food quote plus staffing & logistics —
 * shown after every cost section so the decision covers the full amount.
 */
export default function PortalApprovalPanel({ event, quote, serviceTotal = 0 }) {
  const [deciding, setDeciding] = useState(false);
  const queryClient = useQueryClient();

  if (!quote) return null;

  const decided = quote.status === "accepted" || quote.status === "rejected";
  const grandTotal = (quote.total || 0) + serviceTotal;

  const decide = async (decision) => {
    setDeciding(true);
    try {
      const res = await base44.functions.invoke("decideCateringQuote", { quote_id: quote.id, decision, approved_total: grandTotal });
      if (res.data?.error) toast.error(res.data.error);
      else {
        toast.success(decision === "accepted" ? "Thank you — your booking is approved" : "Your quote has been rejected");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["portal-quotes", event.id] }),
          queryClient.invalidateQueries({ queryKey: ["portal-events"] }),
        ]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not submit your decision");
    } finally {
      setDeciding(false);
    }
  };

  return (
    <Card className="p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Food & beverage</span>
        <span>{formatCurrency(quote.total || 0, true)}</span>
      </div>
      {serviceTotal > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Servicing cost</span>
          <span>{formatCurrency(serviceTotal, true)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold border-t pt-2">
        <span>Total to approve</span>
        <span>{formatCurrency(grandTotal, true)}</span>
      </div>

      {decided ? (
        quote.status === "accepted" ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
            <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Booking approved — thank you!
            </p>
            <p className="text-sm text-emerald-900">
              Next step: pay a deposit of {formatCurrency(event.required_deposit_amount || 0, true)} to secure your date,
              then tell us about the transfer in the deposit section below. Our team has been notified and will confirm your event once the deposit is verified.
            </p>
          </div>
        ) : (
          <p className="text-sm font-medium text-red-600">
            You rejected this booking. Contact us if you'd like a revised quote.
          </p>
        )
      ) : quote.status === "active" ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" className="gap-1.5" disabled={deciding} onClick={() => decide("accepted")}>
            <Check className="w-4 h-4" /> Approve booking
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-red-600" disabled={deciding} onClick={() => decide("rejected")}>
            <X className="w-4 h-4" /> Reject
          </Button>
        </div>
      ) : null}
    </Card>
  );
}