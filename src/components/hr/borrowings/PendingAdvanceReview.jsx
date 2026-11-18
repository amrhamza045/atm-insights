import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AdvanceHistory from "@/components/hr/borrowings/AdvanceHistory";
import { policyError } from "@/components/hr/borrowings/BorrowingWindowPicker";

// Reviewer panel for an employee-submitted request: base salary, typical amount, history, approve/reject.
export default function PendingAdvanceReview({ borrowing }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const { data } = useQuery({
    queryKey: ["advanceReviewContext", borrowing.employee_id],
    queryFn: () => base44.functions.invoke("employeeBorrowing", { action: "reviewContext", employee_id: borrowing.employee_id }).then((r) => r.data),
  });
  const decide = useMutation({
    mutationFn: (decision) => base44.functions.invoke("employeeBorrowing", { action: "decide", id: borrowing.id, decision, reason }),
    onError: (e) => toast.error(policyError(e)),
    onSuccess: () => { toast.success("Decision saved"); qc.invalidateQueries({ queryKey: ["employeeBorrowings"] }); qc.invalidateQueries({ queryKey: ["advanceReviewContext"] }); },
  });
  // The current request is already in the history; show earlier ones.
  const past = (data?.history || []).filter((h) => h.id !== borrowing.id);

  return (
    <div className="space-y-3 border-t pt-3">
      {data && <AdvanceHistory salary={data.salary} typical={data.typical_amount} count={data.request_count} history={past} limit={3} />}
      {rejecting ? (
        <div className="space-y-2">
          <Input placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setRejecting(false)}>Back</Button>
            <Button size="sm" variant="destructive" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate("reject")}>Confirm reject</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Finance chooses the payment method in Payouts after approval.</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={decide.isPending} onClick={() => decide.mutate("approve")}>Approve Request</Button>
            <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => setRejecting(true)}>Reject</Button>
          </div>
        </div>
      )}
    </div>
  );
}