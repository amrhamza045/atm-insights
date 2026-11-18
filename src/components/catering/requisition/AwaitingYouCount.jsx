import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { REQUISITION_POLL_MS } from "./requisitionApi";

/**
 * "N requisitions waiting on you": a server count of requisitions whose turn is the current user's side.
 * Shown only to holders of that side's assigned flag (Roles tab + per-user overrides).
 */
export default function AwaitingYouCount({ query, flag }) {
  const { assigned } = usePermissions();
  const allowed = assigned?.[flag] === true;
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ["requisitions-awaiting-you", query],
    queryFn: () => base44.entities.Requisition.count(query),
    enabled: allowed,
    refetchInterval: REQUISITION_POLL_MS,
  });
  if (!allowed || isLoading) return null;
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${count ? "border-warning-300 bg-warning-50 text-warning-900" : "border-border bg-card text-muted-foreground"}`}>
      <Bell className="w-4 h-4" />
      <span><span className="font-semibold">{count}</span> requisition{count === 1 ? "" : "s"} waiting on you</span>
    </div>
  );
}