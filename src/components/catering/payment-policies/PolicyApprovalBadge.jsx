import React from "react";
import { Badge } from "@/components/ui/badge";

const STYLES = {
  pending: "bg-violet-100 text-violet-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

/** The booking's approval state under its payment policy (nothing when no approval is needed). */
export default function PolicyApprovalBadge({ event }) {
  const status = event?.policy_approval_status;
  if (!STYLES[status]) return null;
  const label = status === "pending"
    ? event.payment_policy?.approval_status_label || "Awaiting approval"
    : status === "approved" ? "Booking approved" : "Booking not approved";
  return <Badge className={`${STYLES[status]} text-xs`}>{label}</Badge>;
}