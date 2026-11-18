import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { callPaymentPolicy } from "@/components/catering/payment-policies/eventPolicyClient";

const KEY = ["catering-booking-approvals"];

export function usePendingBookings() {
  return useQuery({ queryKey: KEY, queryFn: () => callPaymentPolicy("pending").then((d) => d.events || []) });
}

/** Bookings a payment policy sends for approval, listed for that policy's approver role. */
export default function BookingApprovalQueue() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = usePendingBookings();
  const [busy, setBusy] = useState(null);

  const decide = async (ev, decision) => {
    const note = decision === "reject" ? window.prompt(`Why isn't the booking of "${ev.event_name}" approved?`) : "";
    if (decision === "reject" && !note?.trim()) return;
    setBusy(ev.id);
    try {
      const res = await callPaymentPolicy("decide", { event_id: ev.id, decision, note });
      toast.success(decision === "reject" ? "Booking not approved" : res.status === "confirmed" ? "Booking approved — the event is confirmed" : "Booking approved");
      await Promise.all([KEY, ["catering-events"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading bookings…</p>;
  if (!events.length) return <Card className="p-6 text-center text-sm text-slate-500">No bookings are waiting for your approval.</Card>;
  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <Card key={ev.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-slate-900 truncate">{ev.event_name}</p>
            <p className="flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="w-3.5 h-3.5" /> {ev.event_date} · {ev.client_name} · {ev.expected_guests} guests · {ev.branch_name}</p>
            <p className="mt-1 text-xs text-slate-600">"{ev.payment_policy_name}" · booked {ev.payment_policy_days_ahead} day(s) ahead · quote {formatCurrency(ev.quote_total || 0, true)}</p>
            {ev.hold && <Badge className="mt-1 bg-violet-100 text-violet-800 text-xs">On hold until approved</Badge>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-red-600" disabled={busy === ev.id} onClick={() => decide(ev, "reject")}><X className="w-4 h-4" /> Reject</Button>
            <Button size="sm" className="gap-1" disabled={busy === ev.id} onClick={() => decide(ev, "approve")}><Check className="w-4 h-4" /> Approve</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}