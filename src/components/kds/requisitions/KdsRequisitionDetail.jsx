import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import RequisitionLinesTable from "@/components/catering/requisition/RequisitionLinesTable";
import RequisitionHistory from "@/components/catering/requisition/RequisitionHistory";
import { useRequisitionRecord } from "@/components/catering/requisition/useRequisitionRecord";
import {
  AWAITING_LABEL,
  statusLabel,
  errorText,
  saveExtraLine,
  submitRequisition,
  getEventRequisitionSummary,
  createAdditionalRequisition,
} from "@/components/catering/requisition/requisitionApi";
import ExtraLineForm from "./ExtraLineForm";
import KdsChefTurn from "./KdsChefTurn";
import EventRequisitionMinimumsBanner from "./EventRequisitionMinimumsBanner";
import RequisitionApprovalBanner from "@/components/catering/requisition/RequisitionApprovalBanner";
import RequisitionBatches from "@/components/catering/requisition/batches/RequisitionBatches";

export default function KdsRequisitionDetail({ requisitionId, onSelectRequisition }) {
  const queryClient = useQueryClient();
  const { assigned } = usePermissions();
  const canSubmit = assigned?.requisition_submit === true;
  const { requisition: r, lines, revisions, loading, refresh } = useRequisitionRecord(requisitionId);
  const [editing, setEditing] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const eventSummaryQuery = useQuery({
    queryKey: ["event-requisition-summary", r?.event_id, r?.current_revision, r?.status],
    queryFn: async () => {
      const { data } = await getEventRequisitionSummary(r.event_id);
      return data;
    },
    enabled: !!r?.event_id,
  });

  if (loading || !r) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mt-10" />;
  const editable = r.status === "draft" && canSubmit;
  const chefTurn = r.status === "replied" && r.awaiting_side === "chef";

  const run = async (action, success) => {
    setBusy(true);
    try {
      const res = await action();
      toast.success(typeof success === "function" ? success(res) : success);
      await refresh();
      await eventSummaryQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["kds-requisitions"] });
    }
    catch (e) { toast.error(errorText(e, "That didn't work")); }
    finally { setBusy(false); }
  };
  const remove = (l) => run(() => saveExtraLine({ requisition_id: r.id, action: "remove", line_id: l.id }), "Extra line removed");
  const request = () => run(() => submitRequisition(r.id, comment),
    (res) => (res?.data?.status === "pending_approval" ? "Allowance exhausted — sent to Approval Center" : "Requisition sent to Inventory"));

  const handleCreateAdditional = async (prefillShortfalls) => {
    setBusy(true);
    try {
      const { data } = await createAdditionalRequisition(r.event_id, { prefill_shortfalls: prefillShortfalls });
      toast.success(
        data?.already_open
          ? `Opened existing additional requisition ${data.requisition_number}`
          : `Created additional requisition ${data.requisition_number}`
      );
      await queryClient.invalidateQueries({ queryKey: ["kds-requisitions"] });
      await eventSummaryQuery.refetch();
      if (data?.requisition_id && onSelectRequisition) {
        onSelectRequisition(data.requisition_id);
      }
    } catch (e) {
      toast.error(errorText(e, "Could not create additional requisition"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          <span>{r.requisition_number} · {r.event_name}</span>
          {r.is_additional ? (
            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-xs">
              Additional #{r.requisition_sequence || 2}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Primary #1 (Free editing)</Badge>
          )}
        </SheetTitle>
      </SheetHeader>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="capitalize">{statusLabel(r.status)}</Badge>
        <Badge variant="secondary">{AWAITING_LABEL[r.awaiting_side] || "—"}</Badge>
        <span className="text-muted-foreground">{r.event_date} · Revision {r.current_revision || 0} · Round {r.counter_round || 0}</span>
      </div>
      <EventRequisitionMinimumsBanner
        summary={eventSummaryQuery.data}
        canCreateAdditional={canSubmit}
        creating={busy}
        onCreateFromShortfalls={() => handleCreateAdditional(true)}
        onCreateBlankAdditional={() => handleCreateAdditional(false)}
      />
      <RequisitionApprovalBanner requisition={r} />
      <Tabs defaultValue={r.status === "scheduled" ? "batches" : "lines"}>
        <TabsList><TabsTrigger value="lines">Lines</TabsTrigger><TabsTrigger value="batches">Batches</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
        <TabsContent value="batches"><RequisitionBatches requisition={r} lines={lines} side="chef" canAct={canSubmit} refresh={refresh} /></TabsContent>
        <TabsContent value="lines" className="space-y-4">
          {chefTurn && canSubmit ? <KdsChefTurn key={r.current_revision} requisition={r} lines={lines} refresh={refresh} /> : (
            <>
              <RequisitionLinesTable
                lines={lines}
                renderActions={editable ? (l) => (
                  <span className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" title="Edit quantity" disabled={busy} onClick={() => setEditing(l)}><Pencil className="w-4 h-4" /></Button>
                    {l.line_type === "extra" && (
                      <Button size="icon" variant="ghost" title="Remove extra line" disabled={busy} onClick={() => remove(l)}><Trash2 className="w-4 h-4 text-danger-600" /></Button>
                    )}
                  </span>
                ) : undefined}
              />
              {editable && (editing
                ? <ExtraLineForm requisition={r} line={editing} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
                : <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing({})}><Plus className="w-4 h-4" /> Add extra item</Button>)}
              {editable && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Textarea placeholder="Comment for Inventory (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <Button className="gap-1.5" disabled={busy || !lines.length || !!editing} onClick={request}><Send className="w-4 h-4" /> Request</Button>
                </div>
              )}
              {(r.status === "draft" || chefTurn) && !canSubmit && <p className="text-sm text-muted-foreground">Responding needs the Chef submit permission.</p>}
              {r.status === "submitted" && <p className="text-sm text-muted-foreground">With Inventory — their decisions show here once they reply.</p>}
              {["confirmed", "scheduled"].includes(r.status) && <p className="text-sm text-muted-foreground">Every line is agreed — see Batches for the release dates.</p>}
            </>
          )}
        </TabsContent>
        <TabsContent value="history"><RequisitionHistory revisions={revisions} /></TabsContent>
      </Tabs>
    </div>
  );
}