import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import RequisitionLinesTable from "./RequisitionLinesTable";
import RequisitionRevisionList from "./RequisitionRevisionList";
import { isUncosted } from "./lineCosting";

export default function RequisitionDetails({ requisition }) {
  const key = ["event-requisition", requisition.event_id, requisition.id, requisition.current_revision];
  const lines = useQuery({
    queryKey: [...key, "lines"],
    queryFn: () => base44.entities.RequisitionLine.filter({ requisition_id: requisition.id }, "sort_order", 500),
  });
  const revisions = useQuery({
    queryKey: [...key, "revisions"],
    queryFn: () => base44.entities.RequisitionRevision.filter({ requisition_id: requisition.id }, "-revision_number", 50),
  });
  const all = lines.data || [];
  const active = all.filter((l) => l.is_active !== false);
  const uncosted = requisition.uncosted_line_count ?? active.filter(isUncosted).length;
  const cancelled = requisition.status === "cancelled";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-slate-900">{requisition.requisition_number}</span>
        {requisition.is_additional ? (
          <Badge className="text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
            Additional #{requisition.requisition_sequence || 2}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">Primary #1</Badge>
        )}
        <Badge variant="outline" className="capitalize">{(requisition.status || "").replace(/_/g, " ")}</Badge>
        <span className="text-slate-500">
          Revision {requisition.current_revision} · Planned est. {formatCurrency(requisition.planned_estimated_cost)} · Extras est. {formatCurrency(requisition.extras_estimated_cost)}
          {requisition.allowance_deducted_amount != null ? ` · Deducted from allowance: ${formatCurrency(requisition.allowance_deducted_amount)}` : ""}
        </span>
        {uncosted > 0 && <span className="text-warning-700">· {uncosted} uncosted line(s) not included in the estimates</span>}
      </div>
      {cancelled && <p className="text-xs text-slate-500">{requisition.cancel_reason || "Cancelled."}</p>}
      {lines.isLoading || revisions.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : (
        <>
          <RequisitionLinesTable
            lines={active}
            inactiveCount={all.length - active.length}
            emptyText={cancelled ? "No active lines — every line was made inactive when this requisition was cancelled." : ""}
          />
          <RequisitionRevisionList revisions={revisions.data || []} />
        </>
      )}
    </div>
  );
}