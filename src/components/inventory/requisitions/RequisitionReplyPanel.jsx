import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import RequisitionHistory from "@/components/catering/requisition/RequisitionHistory";
import { useRequisitionRecord } from "@/components/catering/requisition/useRequisitionRecord";
import {
  AWAITING_LABEL,
  statusLabel,
  errorText,
  isStale,
  isAgreed,
  replyRequisition,
  getEventRequisitionSummary,
} from "@/components/catering/requisition/requisitionApi";
import { useRequisitionStock } from "./useRequisitionStock";
import { isComplete, overStockLineIds, savedDecisionsFromLines, shortageItemsFromDecisions } from "./replyRules";
import LineDecisionRow from "./LineDecisionRow";
import RequisitionShortageBanner from "./RequisitionShortageBanner";
import EventRequisitionMinimumsBanner from "@/components/kds/requisitions/EventRequisitionMinimumsBanner";
import RequisitionApprovalBanner from "@/components/catering/requisition/RequisitionApprovalBanner";
import RequisitionBatches from "@/components/catering/requisition/batches/RequisitionBatches";

export default function RequisitionReplyPanel({ requisitionId }) {
  const { assigned } = usePermissions();
  const { requisition: r, lines, revisions, loading, refresh } = useRequisitionRecord(requisitionId);

  const eventSummaryQuery = useQuery({
    queryKey: ["event-requisition-summary", r?.event_id, r?.current_revision, r?.status],
    queryFn: async () => {
      const { data } = await getEventRequisitionSummary(r.event_id);
      return data;
    },
    enabled: !!r?.event_id,
  });
  // Only open (not yet agreed) lines are decided; agreed lines keep their reservations as competing stock.
  const open = lines.filter((l) => !isAgreed(l));
  const { stock, free } = useRequisitionStock(open);
  const [decisions, setDecisions] = useState({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [shortageAttempted, setShortageAttempted] = useState(false);

  // Hydrate saved draft decisions & comment when opening or refreshing a submitted requisition
  const openDecisionSignature = open.map((l) => `${l.id}:${l.inventory_decision || ""}:${l.agreed_quantity ?? ""}:${l.decision_reason || ""}`).join("|");
  useEffect(() => {
    if (!r || r.status !== "submitted") return;
    const saved = savedDecisionsFromLines(open);
    if (Object.keys(saved).length > 0) {
      setDecisions((prev) => ({ ...saved, ...prev }));
    }
    if (r.saved_reply_comment) {
      setComment((prev) => prev || r.saved_reply_comment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id, r?.current_revision, openDecisionSignature]);

  if (loading || !r) return <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mt-10" />;
  const editable = r.status === "submitted" && r.awaiting_side === "inventory" && assigned?.requisition_respond === true;
  const over = editable ? overStockLineIds(open, decisions, free) : new Set();
  const shortages = editable ? shortageItemsFromDecisions(open, decisions, free) : [];
  const complete = open.length > 0 && open.every((l) => isComplete(l, decisions[l.id]));

  const confirmAllOpen = () => {
    const next = { ...decisions };
    open.forEach((l) => {
      next[l.id] = { decision: "confirmed" };
    });
    setDecisions(next);
    toast.success(`Confirmed all ${open.length} open line(s)`);
  };

  const send = async () => {
    setBusy(true);
    try {
      const payload = open.map((l) => ({
        line_id: l.id,
        decision: decisions[l.id]?.decision,
        reason: decisions[l.id]?.reason,
        agreed_quantity: decisions[l.id]?.agreed_quantity === undefined || decisions[l.id]?.agreed_quantity === "" ? undefined : Number(decisions[l.id].agreed_quantity),
      }));
      const res = await replyRequisition(r.id, r.current_revision || 0, payload, comment);
      if (res?.data?.status === "pending_approval") {
        toast.warning(
          res.data.approval_reason ||
            "Event allowance balance changed — this requisition now exceeds the remaining allowance and was routed to Approval Center."
        );
      } else {
        toast.success("Reply sent");
      }
      setShortageAttempted(false);
      setDecisions({});
      setComment("");
      await refresh();
    } catch (e) {
      const data = e?.response?.data;
      if (data?.code === "stock_changed") {
        setShortageAttempted(true);
        toast.warning(data.error || "Some confirmed items exceed free stock. Your decisions were saved — raise a draft PO first.");
        await refresh();
      } else {
        const short = data?.lines;
        toast.error(errorText(e, "Could not send the reply") + (Array.isArray(short) ? `: ${short.map((s) => s.item || s).join(", ")}` : ""));
        if (isStale(e)) { setDecisions({}); await refresh(); }
      }
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
            <Badge variant="outline" className="text-xs">Primary #1</Badge>
          )}
        </SheetTitle>
      </SheetHeader>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="capitalize">{statusLabel(r.status)}</Badge>
        <Badge variant="secondary">{AWAITING_LABEL[r.awaiting_side] || "—"}</Badge>
        <span className="text-slate-500">{r.event_date} · Revision {r.current_revision || 0} · Round {r.counter_round || 0}</span>
      </div>
      <EventRequisitionMinimumsBanner summary={eventSummaryQuery.data} canCreateAdditional={false} />
      <RequisitionApprovalBanner requisition={r} />
      <Tabs defaultValue={r.status === "scheduled" ? "batches" : "lines"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="lines">Lines</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          {editable && open.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={confirmAllOpen}
              className="gap-1.5 border-success-300 text-success-700 hover:bg-success-50"
            >
              <CheckCheck className="w-4 h-4" />
              Confirm all
            </Button>
          )}
        </div>
        <TabsContent value="batches"><RequisitionBatches requisition={r} lines={lines} side="inventory" canAct={assigned?.requisition_respond === true} canRelease={assigned?.requisition_release === true} refresh={refresh} /></TabsContent>
        <TabsContent value="lines" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-1.5 pr-3 font-medium">Type</th><th className="py-1.5 pr-3 font-medium">Item</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Requested</th><th className="py-1.5 pr-3 font-medium text-right">Est. cost</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Free stock</th><th className="py-1.5 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((l) => (
                  <LineDecisionRow key={l.id} line={l} stock={isAgreed(l) ? null : stock.get(l.inventory_item_id)} decision={decisions[l.id]}
                    editable={editable && !isAgreed(l)} overStock={over.has(l.id)} onChange={(d) => setDecisions((prev) => ({ ...prev, [l.id]: d }))} />
                ))}
              </tbody>
            </table>
          </div>
          {editable && shortages.length > 0 && (
            <RequisitionShortageBanner
              requisition={r}
              shortages={shortages}
              serverShortageAttempted={shortageAttempted}
            />
          )}
          {editable && (
            <div className="space-y-2 border-t pt-3">
              <Textarea placeholder="Comment for the chef (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button className="gap-1.5" disabled={busy || !complete} onClick={send}><Send className="w-4 h-4" /> Send reply</Button>
              {!complete && <p className="text-xs text-slate-500">Decide every open line first. Edits need a new quantity, a reason, and clicking Confirm edit; declines need a reason. Agreed lines are locked.</p>}
            </div>
          )}
          {r.status === "submitted" && r.awaiting_side === "inventory" && !editable && <p className="text-sm text-slate-500">Replying needs the Inventory respond permission.</p>}
        </TabsContent>
        <TabsContent value="history"><RequisitionHistory revisions={revisions} /></TabsContent>
      </Tabs>
    </div>
  );
}