import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import ManualAttendanceRequestCard from "./ManualAttendanceRequestCard";
import { useSelfApprovalBypass } from "@/components/approvals/useSelfApproval";

export default function PendingHRConfirmations({ records, currentUser, canReview }) {
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const selfBypass = useSelfApprovalBypass();
  const review = useMutation({
    mutationFn: async ({ attendanceId, decision, reason: rejectionReason }) => {
      try {
        const response = await base44.functions.invoke("reviewManualAttendance", { attendanceId, decision, reason: rejectionReason });
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || error.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attendanceByDate"] });
      queryClient.invalidateQueries({ queryKey: ["todayAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["adminTodayAttendance"] });
      toast.success(variables.decision === "confirm" ? "Presence confirmed" : "Request rejected");
      setRejecting(null); setReason("");
    },
    onError: (error) => toast.error(error.message),
  });
  const reject = () => {
    if (!reason.trim()) return toast.error("A rejection reason is required");
    review.mutate({ attendanceId: rejecting.id, decision: "reject", reason });
  };

  if (!records.length) return null;
  return (
    <>
      <Card className="border-amber-200">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Pending HR Confirmation ({records.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {records.map((record) => <ManualAttendanceRequestCard key={record.id} record={record} canReview={canReview} isSelf={!selfBypass && record.employeeEmail?.toLowerCase() === currentUser?.email?.toLowerCase()} busy={review.isPending} onConfirm={() => review.mutate({ attendanceId: record.id, decision: "confirm" })} onReject={() => setRejecting(record)} />)}
        </CardContent>
      </Card>
      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reject manual check-in</DialogTitle></DialogHeader>
          <div className="space-y-4"><div><Label>Rejection reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request is rejected" /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" onClick={reject} disabled={review.isPending}>{review.isPending ? "Rejecting..." : "Reject request"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}