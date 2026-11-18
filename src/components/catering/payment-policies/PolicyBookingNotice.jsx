import React from "react";
import { AlertTriangle } from "lucide-react";
import { daysUntil } from "@/components/catering/cateringLogic";
import { usePaymentPolicies } from "./usePaymentPolicies";
import { matchPolicy } from "./eventPolicyClient";
import PolicySummaryBox from "./PolicySummaryBox";

/** Booking form: the payment policy the event gets for its date. The server applies it when the event is saved. */
export default function PolicyBookingNotice({ eventDate, event }) {
  const { policies, isLoading } = usePaymentPolicies();

  if (event?.payment_policy_id && event.event_date === eventDate) {
    return (
      <PolicySummaryBox
        policy={event.payment_policy || { name: event.payment_policy_name }}
        note={`Applied on ${event.payment_policy_booked_on}, ${event.payment_policy_days_ahead} day(s) before the event. A new date applies the policy for that date.`}
      />
    );
  }
  if (!eventDate) return <p className="text-xs text-slate-500">Pick the event date to see which payment policy applies.</p>;
  const days = daysUntil(eventDate);
  if (isLoading || days < 0) return null;

  const policy = matchPolicy(policies, days);
  if (!policy) {
    return (
      <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>No active payment policy covers events booked {days} day(s) ahead, so this date can't be booked. An admin needs to add one in Catering › Settings › Payment Policies.</span>
      </div>
    );
  }
  return <PolicySummaryBox policy={policy} note={`Booked ${days} day(s) before the event${event?.id ? " — saving applies this policy for the new date" : ""}.`} />;
}