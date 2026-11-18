import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

/** Warns when a policy's approver role can't see Approvals › Booking Approvals. */
export default function ApproverAccessHint({ roleKey }) {
  // Same cache as the role dropdowns (useRoleOptions).
  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => base44.entities.Role.list("sort_order") });
  if (!roleKey || isLoading || !roles) return null;

  const role = roles.find((r) => r.role_key === roleKey && r.is_active !== false);
  const message = !role
    ? `The approver role "${roleKey}" isn't an active role, so nobody can approve these bookings.`
    : !role.permissions?.users_manage && !role.permissions?.catering_booking_approve
      ? `${role.role_label || role.role_key} doesn't have the Booking Approvals permission yet, so its members can't see these bookings. Give it in Admin › Role Management.`
      : null;
  if (!message) return null;

  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {message}
    </p>
  );
}