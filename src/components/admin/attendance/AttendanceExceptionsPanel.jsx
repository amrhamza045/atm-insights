import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { EXCEPTION_REASONS, incidentType } from "@/components/admin/attendance/exceptionReasons";

const WAIVABLE_TYPES = ["late_arrival", "absence", "early_leave"];

export default function AttendanceExceptionsPanel({ records, date, currentUser, canReview }) {
  const queryClient = useQueryClient();

  const incidents = records.filter(r =>
    r.review_status === "approved" && (r.exception_waived || (r.deduction_amount || 0) > 0)
  );

  const { data: penalties = [] } = useQuery({
    queryKey: ["incidentPenalties", date],
    queryFn: () => base44.entities.SalaryPenalty.filter({ incident_date: date }),
  });

  const waive = useMutation({
    mutationFn: async ({ record, reason }) => {
      const now = new Date().toISOString();
      const by = currentUser?.email || "admin";
      await base44.entities.Attendance.update(record.id, {
        exception_waived: true,
        exception_reason: reason,
        exception_by: by,
        exception_date: now,
        waived_deduction_amount: record.deduction_amount || 0,
        waived_deduction_breakdown: record.deduction_breakdown || "",
        deduction_amount: 0,
        calculated_earnings: (record.calculated_earnings || 0) + (record.deduction_amount || 0),
        reviewer_notes: `${record.reviewer_notes || ""}\n[Exception: ${reason}]`.trim(),
      });
      // Also cancel this employee's still-pending penalty for the same incident day.
      const linked = penalties.filter(p =>
        p.employee_id === record.employee_id && p.status === "pending" && WAIVABLE_TYPES.includes(p.penalty_type)
      );
      await Promise.all(linked.map(p =>
        base44.entities.SalaryPenalty.update(p.id, {
          status: "cancelled",
          description: `${p.description || ""} [Waived: ${reason}]`.trim(),
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceByDate"] });
      queryClient.invalidateQueries({ queryKey: ["incidentPenalties"] });
      queryClient.invalidateQueries({ queryKey: ["salaryPenalties"] });
      toast.success("Marked as exception — penalty waived");
    },
    onError: (e) => toast.error("Failed to waive: " + e.message),
  });

  if (incidents.length === 0) return null;

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldOff className="w-4 h-4" /> Late Arrivals, No-Shows & Penalties ({incidents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {incidents.map(r => {
          const pendingPenalty = penalties
            .filter(p => p.employee_id === r.employee_id && p.status === "pending" && WAIVABLE_TYPES.includes(p.penalty_type))
            .reduce((s, p) => s + (p.amount || 0), 0);
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 flex-wrap border rounded-lg p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{r.employeeName}</span>
                  <Badge variant="outline" className="text-xs">{incidentType(r)}</Badge>
                  {r.late_minutes > 0 && <span className="text-xs text-slate-500">{r.late_minutes} min late</span>}
                </div>
                {r.exception_waived ? (
                  <p className="text-xs text-green-700 mt-1">
                    Exception: {r.exception_reason} — waived {(r.waived_deduction_amount || 0).toFixed(2)} EGP by {r.exception_by}
                  </p>
                ) : (
                  <p className="text-xs text-red-600 mt-1">
                    Penalty {r.deduction_amount.toFixed(2)} EGP{pendingPenalty > 0 ? ` + ${pendingPenalty.toFixed(2)} EGP pending penalty` : ""}
                    {r.deduction_breakdown ? ` (${r.deduction_breakdown})` : ""}
                  </p>
                )}
              </div>
              {r.exception_waived ? (
                <Badge className="bg-green-600">Waived</Badge>
              ) : canReview && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" disabled={waive.isPending}>Mark as Exception</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-2">
                    <p className="text-xs text-slate-500 px-2 pb-1">Choose a reason to waive this penalty</p>
                    {EXCEPTION_REASONS.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-slate-100"
                        onClick={() => waive.mutate({ record: r, reason })}
                      >
                        {reason}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}