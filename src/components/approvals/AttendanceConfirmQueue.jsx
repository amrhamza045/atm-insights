import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AttendanceConfirmQueue({ canApprove }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  const { data } = useQuery({
    queryKey: ["approvals-attendance-pending"],
    queryFn: () => base44.entities.Attendance.filter({ status: "pending_hr_confirmation" }, { sort: "-created_date", limit: 50 }),
  });
  const items = data?.items || [];

  const decide = async (id, decision) => {
    if (decision === "reject" && !reason.trim()) return toast.error("A rejection reason is required");
    setBusy(id);
    try {
      await base44.functions.invoke("reviewManualAttendance", { attendanceId: id, decision, reason });
      toast.success(decision === "confirm" ? "Presence confirmed" : "Request rejected");
      setRejecting(null); setReason("");
      queryClient.invalidateQueries({ queryKey: ["approvals-attendance-pending"] });
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setBusy(null);
    }
  };

  if (!items.length) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" /> Attendance Confirmations ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="border-warning-300 bg-warning-50/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold">{a.employee_name}</span>
                <span className="text-slate-600">{a.branch_name} · {a.attendance_date} · in {a.sign_in_time ? new Date(a.sign_in_time).toLocaleTimeString() : "—"}</span>
              </div>
              {a.manual_request_note && <p className="text-sm text-slate-600">Note: {a.manual_request_note}</p>}
              {canApprove && (rejecting === a.id ? (
                <div className="flex gap-2">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" />
                  <Button variant="destructive" disabled={busy === a.id} onClick={() => decide(a.id, "reject")}>Reject</Button>
                  <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" disabled={busy === a.id} onClick={() => decide(a.id, "confirm")}><Check className="w-4 h-4" /> Confirm</Button>
                  <Button variant="destructive" className="flex-1 gap-2" disabled={busy === a.id} onClick={() => setRejecting(a.id)}><X className="w-4 h-4" /> Reject</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}