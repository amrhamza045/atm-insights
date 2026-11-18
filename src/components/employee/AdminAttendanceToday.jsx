import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";

export default function AdminAttendanceToday() {
  const today = new Date().toISOString().split("T")[0];

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["adminTodayAttendance", today],
    queryFn: () => base44.entities.Attendance.filter({ attendance_date: today }, "-sign_in_time"),
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              Today's Attendance
            </CardTitle>
            <p className="text-sm text-slate-500">
              You are viewing as an admin. Employee check-in actions are available only to registered employees.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No attendance records for today yet.</p>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => {
                  const awaitingHR = rec.status === "pending_hr_confirmation";
                  const rejectedHR = rec.status === "rejected_hr_confirmation";
                  const signedIn = !!rec.sign_in_time && !rec.sign_out_time && !awaitingHR && !rejectedHR;
                  return (
                    <div key={rec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div>
                        <p className="font-semibold text-slate-900">{rec.employee_name}</p>
                        {rec.branch_name && <p className="text-xs text-slate-500">{rec.branch_name}</p>}
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        {rec.sign_in_time && (
                          <div>
                            <p className="text-xs text-slate-500">In</p>
                            <p className="text-sm font-medium">{new Date(rec.sign_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        )}
                        {rec.sign_out_time && (
                          <div>
                            <p className="text-xs text-slate-500">Out</p>
                            <p className="text-sm font-medium">{new Date(rec.sign_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        )}
                        {rec.hours_worked != null && (
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {Number(rec.hours_worked).toFixed(2)}h
                          </div>
                        )}
                        <Badge className={awaitingHR ? "bg-amber-500" : rejectedHR ? "bg-red-600" : signedIn ? "bg-green-600" : "bg-blue-600"}>
                          {awaitingHR ? "Awaiting HR" : rejectedHR ? "HR rejected" : signedIn ? "Signed In" : rec.sign_out_time ? "Signed Out" : rec.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}