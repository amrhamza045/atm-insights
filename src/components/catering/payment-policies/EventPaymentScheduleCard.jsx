import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { callPaymentPolicy, hasPaymentPolicy } from "./eventPolicyClient";
import PolicyApprovalBadge from "./PolicyApprovalBadge";
import PolicyScheduleRows from "./PolicyScheduleRows";
import PolicyIssuesNotice from "./PolicyIssuesNotice";

/** Payments tab: the event's payment policy, each payment against what is paid, and what it blocks. */
export default function EventPaymentScheduleCard({ event }) {
  const enabled = hasPaymentPolicy(event);
  const { data, error, isLoading } = useQuery({
    queryKey: ["catering-policy-status", event?.id, event?.updated_date],
    queryFn: () => callPaymentPolicy("status", { event_id: event.id }),
    enabled,
  });
  if (!enabled) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Coins className="w-4 h-4 text-amber-600" /> Payment policy: {data?.policy_name || event.payment_policy_name}
          </p>
          <p className="text-xs text-slate-500">
            Applied {data?.booked_on || event.payment_policy_booked_on}, {data?.days_ahead ?? event.payment_policy_days_ahead} day(s) before the event
          </p>
          {data?.approval?.note && <p className="text-xs text-slate-500">Approver's note: {data.approval.note}</p>}
        </div>
        <PolicyApprovalBadge event={event} />
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <>
          <PolicyScheduleRows steps={data.steps || []} totalPaid={data.total_paid} today={data.today} priced={data.whole > 0} />
          <PolicyIssuesNotice issues={data.issues} />
        </>
      )}
    </Card>
  );
}