import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, XCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { logEventAudit } from "./eventAudit";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { canApproveReservation } from "./cateringGuards";
import { reserveForEvent } from "./productionPlanning";
import { assertDepositCoversQuote } from "./cateringFinance";

/**
 * Deposit received → the event queues here instead of committing stock.
 * A Catering Manager/owner approves, and only then are materials reserved and
 * the production plan generated.
 */
export default function ReservationApprovalCard({ event, standardActions = false, onDetails }) {
  const queryClient = useQueryClient();
  const { selectedBranch } = useBranch();
  const { permissions, currentUser } = usePermissions();
  const [working, setWorking] = useState(false);
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  if (event?.reservation_status !== "pending_approval") return null;

  const gate = canApproveReservation({ permissions, currentUser, event });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-production"] }),
    ]);

  const approve = async () => {
    if (!event.active_quote_id) return toast.error("This event needs an active quote first");
    setWorking(true);
    try {
      const [quote, user] = await Promise.all([
        base44.entities.CateringQuote.get(event.active_quote_id),
        base44.auth.me(),
      ]);
      await assertDepositCoversQuote({ eventId: event.id, quote });
      await base44.functions.invoke("reviewCateringReservation", { event_id: event.id, decision: "approve" });
      const res = await reserveForEvent({ event, quote, branch: selectedBranch, userEmail: user?.email });
      logEventAudit("approve", event, `Approved reservation · ${res.rows.length} item(s), ${res.shortfalls.length} shortfall(s)`);
      await refresh();
      if (res.shortfalls.length) toast.error(`Reserved with ${res.shortfalls.length} shortfall(s) — see Planning`);
      else toast.success(`Approved · ${res.rows.length} item(s) reserved, ${res.batches.length} batch(es) planned`);
    } catch (e) {
      if (e?.name === "DepositNotCoveredError") {
        await refresh();
        toast.error(e.message, { duration: 8000 });
      } else if (e?.name === "StockFlowError" || e?.name === "RequisitionLockedError") toast.error(e.message, { duration: 8000 });
      else toast.error(e?.response?.data?.error || "Could not approve and reserve");
    } finally {
      setWorking(false);
    }
  };

  const sendBack = async () => {
    setWorking(true);
    try {
      await base44.functions.invoke("reviewCateringReservation", { event_id: event.id, decision: "send_back", reason });
      logEventAudit("reject", event, `Sent reservation back: ${reason || "Sent back by the approver"}`);
      await refresh();
      toast.success("Sent back — nothing was reserved");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not send this back");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-amber-300 bg-amber-50">
      <div>
        <p className="font-semibold text-amber-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> Reservation awaiting manager approval
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          The deposit is in, so this event is queued for approval. No stock is committed and no production is planned
          until a Catering Manager or the owner approves it here.
          {event.reservation_requested_by ? ` Requested by ${event.reservation_requested_by}.` : ""}
        </p>
      </div>

      {gate.allowed && standardActions ? (
        <>
          <div className="flex items-center gap-2 pt-1">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={working}
              onClick={approve}
            >
              <Check className="w-4 h-4" /> Approve
            </Button>
            <Button
              className="flex-1 gap-2 bg-red-500 hover:bg-red-600 text-white"
              disabled={working}
              onClick={() => setRejectOpen(true)}
            >
              <X className="w-4 h-4" /> Reject
            </Button>
            {onDetails && (
              <Button variant="outline" className="bg-white" onClick={() => onDetails(event)}>
                Details
              </Button>
            )}
          </div>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject reservation</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Reason for rejection"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={working}
                  onClick={async () => {
                    await sendBack();
                    setRejectOpen(false);
                  }}
                >
                  Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : gate.allowed && false ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={working} onClick={approve}>
            <ShieldCheck className="w-4 h-4" /> Approve & reserve
          </Button>
          <Input
            className="max-w-xs bg-white"
            placeholder="Reason (for sending back)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button size="sm" variant="outline" className="gap-1.5 text-red-600" disabled={working} onClick={sendBack}>
            <XCircle className="w-4 h-4" /> Send back
          </Button>
        </div>
      ) : (
        <p className="text-xs text-amber-800">
          {gate.allowed ? "Review this reservation in the Approval Center." : gate.reason}
        </p>
      )}
    </Card>
  );
}