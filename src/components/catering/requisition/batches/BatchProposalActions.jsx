import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, GitBranch, Undo2, X } from "lucide-react";

/**
 * The other side: Accept / Decline (reason) / Propose different. The proposer's side: Withdraw.
 * No open proposal: Propose split / dates.
 */
export default function BatchProposalActions({ proposal, side, busy, onAccept, onDecline, onWithdraw, onPropose }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  if (!proposal)
    return <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={onPropose}><GitBranch className="w-4 h-4" /> Propose split / dates</Button>;
  if (proposal.side === side)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">Waiting for the other side to answer your proposal.</p>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={onWithdraw}><Undo2 className="w-4 h-4" /> Withdraw</Button>
      </div>
    );
  if (declining)
    return (
      <div className="space-y-2">
        <Textarea placeholder="Why are you declining? (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onDecline(reason)}>Decline proposal</Button>
          <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>Cancel</Button>
        </div>
      </div>
    );
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="gap-1.5" disabled={busy} onClick={onAccept}><Check className="w-4 h-4" /> Accept</Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => setDeclining(true)}><X className="w-4 h-4" /> Decline</Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={onPropose}><GitBranch className="w-4 h-4" /> Propose different</Button>
    </div>
  );
}