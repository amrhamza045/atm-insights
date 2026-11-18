import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { lifecycle } from "./lifecycleApi";

/** Approve / reject buttons for a pending item; rejection needs a reason. */
export default function DecisionActions({ action, id }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: (decision) => lifecycle({ action, id, decision, note }),
    onSuccess: () => { toast.success("Decision saved"); qc.invalidateQueries({ queryKey: ["lifetime"] }); },
    onError: (e) => toast.error(e.message),
  });

  if (rejecting) {
    return (
      <div className="flex gap-2 items-center mt-2">
        <Input className="h-8" placeholder="Reason for rejection" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="destructive" disabled={!note.trim() || decide.isPending} onClick={() => decide.mutate("reject")}>Confirm</Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2 mt-2">
      <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate("approve")}>{decide.isPending ? "Saving…" : "Approve"}</Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>Reject</Button>
    </div>
  );
}