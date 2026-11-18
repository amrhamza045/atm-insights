import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2 } from "lucide-react";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import EventRequisitionMinimumsBanner from "@/components/kds/requisitions/EventRequisitionMinimumsBanner";
import RequisitionDetails from "./RequisitionDetails";
import { getStockFlow } from "./requisitionFlow";
import { getEventRequisitionSummary } from "./requisitionApi";

const LEGACY_NOTE = "Stock for this event was issued on the old release-slip flow. Its slip stays as read-only history and planning is locked.";

/** Read-only view of the event's requisitions, baseline minimums, and additional allowance. */
export default function RequisitionPanel({ event }) {
  const { assigned } = usePermissions();
  const canRead = !!(
    assigned?.requisition_view ||
    assigned?.requisition_submit ||
    assigned?.requisition_respond ||
    assigned?.requisition_approve
  );
  const flow = useQuery({
    queryKey: ["requisition-flow", event?.id],
    queryFn: () => getStockFlow(event),
    enabled: !!event?.id,
  });
  const onRequisition = flow.data?.requisition === true;

  const requisitions = useQuery({
    queryKey: ["event-requisitions", event?.id],
    queryFn: async () => {
      const list = await base44.entities.Requisition.filter({ event_id: event.id }, "created_date", 50);
      const active = list
        .filter((r) => r.status !== "cancelled")
        .sort((a, b) => (Number(a.requisition_sequence) || 1) - (Number(b.requisition_sequence) || 1));
      if (active.length) return active;
      const lastCancelled = list
        .filter((r) => r.status === "cancelled")
        .sort((a, b) => String(b.cancelled_date || "").localeCompare(String(a.cancelled_date || "")))[0];
      return lastCancelled ? [lastCancelled] : [];
    },
    enabled: canRead && onRequisition && !!event?.id,
  });

  const eventSummary = useQuery({
    queryKey: ["event-requisition-summary", event?.id, (requisitions.data || []).map((r) => `${r.id}:${r.current_revision}`).join(",")],
    queryFn: async () => {
      const { data } = await getEventRequisitionSummary(event.id);
      return data;
    },
    enabled: canRead && onRequisition && !!event?.id,
  });

  const loading = flow.isLoading || requisitions.isLoading;
  const rows = requisitions.data || [];
  const note = flow.isError ? "Could not check this event's stock flow."
    : !onRequisition ? LEGACY_NOTE
    : !canRead ? "Requisitions are visible to staff with kitchen display or inventory access."
    : !rows.length ? "No requisition yet. Generate plan & reserve creates the draft."
    : "";

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-slate-400" /> Stock Release Slip Requisitions
        <Badge variant="outline" className="text-xs font-normal">Read-only</Badge>
      </h3>
      {canRead && onRequisition && eventSummary.data && (
        <EventRequisitionMinimumsBanner summary={eventSummary.data} canCreateAdditional={false} />
      )}
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : note ? (
        <p className="text-sm text-slate-500">{note}</p>
      ) : (
        <div className="space-y-4 divide-y divide-border">
          {rows.map((req) => (
            <div key={req.id} className="pt-3 first:pt-0">
              <RequisitionDetails requisition={req} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}