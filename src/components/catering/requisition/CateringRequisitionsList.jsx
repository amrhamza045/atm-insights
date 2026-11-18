import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import RequisitionSummary from "./RequisitionSummary";
import RequisitionDetails from "./RequisitionDetails";
import { REQUISITION_POLL_MS } from "./requisitionApi";
import { whenQuery } from "@/components/catering/all/allEventsQuery";

/** Catering's read-only list of the branch's requisitions (chef acts on KDS, inventory on Requested Items). */
export default function CateringRequisitionsList({ branchId, eventId, when }) {
  const { assigned } = usePermissions();
  const canRead = assigned?.requisition_view === true;
  const [openId, setOpenId] = useState(null);
  // Branch-wide with `when`: only those event dates. Scoped to an event: all of its requisitions.
  const range = !eventId && when ? whenQuery("event_date", when) : { query: {}, sort: "event_date" };
  const query = { ...(branchId ? { branch_id: branchId } : {}), ...(eventId ? { event_id: eventId } : {}), status: { $ne: "cancelled" }, ...range.query };
  const list = useQuery({
    queryKey: ["catering-requisitions", branchId, eventId, when],
    queryFn: () => base44.entities.Requisition.filter(query, range.sort, 100),
    enabled: canRead,
    refetchInterval: REQUISITION_POLL_MS,
  });
  const rows = list.data || [];
  const selected = rows.find((r) => r.id === openId);

  if (!canRead) return <p className="text-sm text-slate-500">Requisitions are visible to staff with requisition access.</p>;
  if (list.isLoading) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  if (!rows.length) return <p className="text-sm text-slate-500">No open requisitions. Generate plan &amp; reserve on the Planning tab creates the event's draft.</p>;
  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => <RequisitionSummary key={r.id} requisition={r} onOpen={() => setOpenId(r.id)} />)}
      </div>
      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">{selected && <RequisitionDetails requisition={selected} />}</SheetContent>
      </Sheet>
    </>
  );
}