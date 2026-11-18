import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PackageCheck, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { errorText, isStale } from "../requisitionApi";
import { planBatches, planOfSlips, unreleasedLines, isReleasedBatch, useBatchSlips } from "./batchPlan";
import BatchPlanView from "./BatchPlanView";
import BatchPlanEditor from "./BatchPlanEditor";
import BatchProposalActions from "./BatchProposalActions";
import BatchReleaseDialog from "./BatchReleaseDialog";
import BatchReceiveDialog from "./BatchReceiveDialog";

const SIDE_NAME = { chef: "Chef", inventory: "Inventory" };
const PERMISSION_NAME = { chef: "Chef submit", inventory: "Inventory respond" };

/**
 * Batches section, the same on the KDS (side "chef") and Requested Items (side "inventory").
 * Inventory with requisition_release releases scheduled batches; the chef confirms receipt of released ones.
 */
export default function RequisitionBatches({ requisition: r, lines, side, canAct, canRelease = false, refresh }) {
  const slips = useBatchSlips(r);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [releasing, setReleasing] = useState(null);
  const [receiving, setReceiving] = useState(null);
  if (slips.isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  const current = planOfSlips(slips.data || []);
  const unreleased = current.filter((b) => !isReleasedBatch(b));
  const proposal = r.batch_proposal?.batches?.length ? r.batch_proposal : null;
  const scheduled = r.status === "scheduled";
  const revision = r.current_revision || 0;

  const run = async (payload, success) => {
    setBusy(true);
    try {
      await planBatches({ requisition_id: r.id, revision, side, ...payload });
      toast.success(success);
      setEditing(false);
      await refresh();
    } catch (e) {
      const problems = e?.response?.data?.problems;
      toast.error(errorText(e, "That didn't work") + (Array.isArray(problems) ? `: ${problems.join("; ")}` : ""));
      if (isStale(e)) await refresh();
    } finally {
      setBusy(false);
    }
  };
  const done = async () => { setReleasing(null); setReceiving(null); await refresh(); };
  const actions = (b) => {
    if (side === "inventory" && canRelease && scheduled && b.status === "scheduled")
      return <Button size="sm" className="gap-1.5 mt-1" onClick={() => setReleasing(b)}><PackageOpen className="w-4 h-4" /> Release batch</Button>;
    if (side === "chef" && canAct && b.status === "released")
      return <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setReceiving(b)}><PackageCheck className="w-4 h-4" /> Confirm received</Button>;
    return null;
  };

  if (!current.length && !proposal)
    return <p className="text-sm text-muted-foreground">No batches yet — batch 1 is created on the event date once every line is agreed.</p>;
  return (
    <div className="space-y-4">
      {proposal ? (
        <>
          <div className="rounded-lg bg-warning-50 border border-warning-200 p-3 text-sm">
            <p className="font-medium text-warning-900">{SIDE_NAME[proposal.side]} proposed a new batch plan · {proposal.proposed_by} · {new Date(proposal.proposed_at).toLocaleString()}</p>
            {proposal.comment && <p className="text-warning-800 mt-1">“{proposal.comment}”</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <BatchPlanView title="Current plan" plan={current} actions={actions} highlightDue={side === "inventory"} />
            <BatchPlanView title="Proposed plan" plan={proposal.batches} proposed />
          </div>
        </>
      ) : <BatchPlanView title={`Batches (${current.length})`} plan={current} actions={actions} highlightDue={side === "inventory"} />}
      {scheduled && canAct && !editing && unreleased.length > 0 && (
        <BatchProposalActions proposal={proposal} side={side} busy={busy} onPropose={() => setEditing(true)}
          onAccept={() => run({ action: "accept" }, "Batch plan accepted — batches updated")}
          onDecline={(reason) => run({ action: "decline", reason }, "Proposal declined — the current plan stays")}
          onWithdraw={() => run({ action: "withdraw" }, "Proposal withdrawn")} />
      )}
      {editing && (
        <BatchPlanEditor lines={unreleasedLines(lines, current)} plan={proposal && proposal.side !== side ? proposal.batches : unreleased} eventDate={r.event_date} busy={busy}
          onSubmit={(batches, comment) => run({ action: "propose", batches, comment }, "Batch plan proposed")} onCancel={() => setEditing(false)} />
      )}
      {scheduled && !canAct && <p className="text-sm text-muted-foreground">Proposing or answering a batch plan needs the {PERMISSION_NAME[side]} permission.</p>}
      {side === "inventory" && scheduled && !canRelease && unreleased.length > 0 && (
        <p className="text-sm text-muted-foreground">Releasing a batch needs the Inventory release batches permission.</p>
      )}
      {releasing && <BatchReleaseDialog batch={releasing} requisitionId={r.id} revision={revision} proposalOpen={!!proposal} onClose={() => setReleasing(null)} onDone={done} />}
      {receiving && <BatchReceiveDialog batch={receiving} requisitionId={r.id} revision={revision} onClose={() => setReceiving(null)} onDone={done} />}
    </div>
  );
}