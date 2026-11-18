import { useState, useMemo } from "react";
import { companyToday, monthEndDate } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Clock, Users, TrendingUp, PoundSterling, Calendar,
  ChevronLeft, ChevronRight, UserCheck, UserX
} from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

export default function AttendanceDashboard() {
  const today = companyToday();
  const currentMonth = today.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const { selectedBranchId } = useBranch();

  // Today's attendance (for "currently clocked in" status)
  const { data: todayRecords = [], isLoading: todayLoading } = useQuery({
    queryKey: ["attendanceByDate", today, selectedBranchId],
    queryFn: () => base44.entities.Attendance.filter({ attendance_date: today, ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) }, "-created_date"),
  });

  // Month attendance (for pay-period hours summary)
  const { data: monthRecords = [], isLoading: monthLoading } = useQuery({
    queryKey: ["attendanceRecords", selectedMonth, selectedBranchId],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = monthEndDate(year, month);
      return base44.entities.Attendance.filter({
        attendance_date: { $gte: startDate, $lte: endDate },
        ...(selectedBranchId ? { branch_id: selectedBranchId } : {})
      });
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "attendance"],
    queryFn: async () => excludeSystemAccounts(await base44.entities.Employee.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, "-created_date")),
  });

  // Currently clocked in = has sign_in_time but no sign_out_time
  const clockedInNow = useMemo(() => {
    return todayRecords
      .filter(r => r.sign_in_time && !r.sign_out_time && !["pending_hr_confirmation", "rejected_hr_confirmation"].includes(r.status))
      .map(r => {
        const emp = employees.find(e => e.id === r.employee_id);
        const signInDate = new Date(r.sign_in_time);
        const elapsedMs = Date.now() - signInDate.getTime();
        const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
        return {
          ...r,
          employeeName: emp?.name || r.employee_name || "Unknown",
          position: emp?.position || "",
          signInTime: r.sign_in_time,
          elapsedHours,
        };
      })
      .sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
  }, [todayRecords, employees]);

  // Per-employee summary for the pay period
  const employeeSummaries = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === "active");
    const summaries = activeEmployees.map(emp => {
      const empRecords = monthRecords.filter(r => r.employee_id === emp.id && !["pending_hr_confirmation", "rejected_hr_confirmation"].includes(r.status));
      const presentDays = empRecords.filter(r => r.status !== "no_show" && r.sign_in_time).length;
      const totalHours = empRecords.reduce((s, r) => s + (r.hours_worked || 0), 0);
      const overtimeHours = empRecords.reduce((s, r) => s + (r.overtime_hours || 0), 0);
      const earnings = empRecords.reduce((s, r) => s + (r.calculated_earnings || 0), 0);
      const deductions = empRecords.reduce((s, r) => s + (r.deduction_amount || 0), 0);
      const approvedDays = empRecords.filter(r => r.review_status === "approved").length;
      const pendingDays = empRecords.filter(r => r.review_status === "pending" || !r.review_status).length;
      const isClockedInNow = clockedInNow.some(c => c.employee_id === emp.id);

      return {
        employee: emp,
        presentDays,
        totalHours,
        overtimeHours,
        earnings,
        deductions,
        approvedDays,
        pendingDays,
        totalRecords: empRecords.length,
        isClockedInNow,
      };
    });

    return summaries.sort((a, b) => {
      // Clock-in status first, then by hours descending
      if (a.isClockedInNow !== b.isClockedInNow) return a.isClockedInNow ? -1 : 1;
      return b.totalHours - a.totalHours;
    });
  }, [employees, monthRecords, clockedInNow]);

  // Totals
  const totals = useMemo(() => {
    return {
      clockedIn: clockedInNow.length,
      totalStaff: employees.filter(e => e.status === "active").length,
      totalHours: employeeSummaries.reduce((s, e) => s + e.totalHours, 0),
      totalOvertime: employeeSummaries.reduce((s, e) => s + e.overtimeHours, 0),
      totalEarnings: employeeSummaries.reduce((s, e) => s + e.earnings, 0),
    };
  }, [clockedInNow, employees, employeeSummaries]);

  const shiftMonth = (offset) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    return d.toISOString().slice(0, 7);
  };

  const formatElapsed = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Attendance Dashboard</h2>
        <p className="text-sm text-slate-500">Live clock-in status and pay-period hours summary</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className={totals.clockedIn > 0 ? "border-green-300 bg-green-50/40" : ""}>
          <CardContent className="p-3 text-center">
            <UserCheck className={`w-5 h-5 mx-auto mb-1 ${totals.clockedIn > 0 ? "text-green-600" : "text-slate-400"}`} />
            <p className="text-xs text-slate-500">Clocked In Now</p>
            <p className="text-xl font-bold text-green-600">{totals.clockedIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-xs text-slate-500">Active Staff</p>
            <p className="text-xl font-bold">{totals.totalStaff}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-xs text-slate-500">Total Hours</p>
            <p className="text-xl font-bold">{totals.totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-xs text-slate-500">Overtime</p>
            <p className="text-xl font-bold text-warning-600">{totals.totalOvertime.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <PoundSterling className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-xs text-slate-500">Est. Earnings</p>
            <p className="text-xl font-bold text-green-600">{totals.totalEarnings.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Clocked In */}
      <Card className={clockedInNow.length > 0 ? "border-green-300" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${clockedInNow.length > 0 ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            Currently Clocked In ({clockedInNow.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : clockedInNow.length === 0 ? (
            <div className="text-center py-6">
              <UserX className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No employees currently clocked in</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clockedInNow.map(emp => (
                <div key={emp.id} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/40 border-green-200">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {emp.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{emp.employeeName}</p>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-600 text-xs mb-1">Active</Badge>
                    <p className="text-xs text-slate-600 font-medium">{formatElapsed(emp.elapsedHours)}</p>
                    <p className="text-xs text-slate-400">since {new Date(emp.signInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Period Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Pay Period Summary — {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(shiftMonth(-1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(shiftMonth(1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : employeeSummaries.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No active employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="pb-2 pr-3">Employee</th>
                    <th className="pb-2 pr-3 text-center">Status</th>
                    <th className="pb-2 pr-3 text-right">Days</th>
                    <th className="pb-2 pr-3 text-right">Hours</th>
                    <th className="pb-2 pr-3 text-right">Overtime</th>
                    <th className="pb-2 pr-3 text-right">Deductions</th>
                    <th className="pb-2 pr-3 text-right">Earnings</th>
                    <th className="pb-2 pr-3 text-center">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummaries.map(({ employee, ...s }) => (
                    <tr key={employee.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs flex-shrink-0">
                            {employee.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-slate-500">{employee.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-center">
                        {s.isClockedInNow ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-600 font-medium">In</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-xs text-slate-400">Out</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">{s.presentDays}</td>
                      <td className="py-2 pr-3 text-right font-medium">{s.totalHours.toFixed(1)}h</td>
                      <td className="py-2 pr-3 text-right">
                        {s.overtimeHours > 0 ? (
                          <span className="text-warning-600 font-medium">{s.overtimeHours.toFixed(1)}h</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {s.deductions > 0 ? (
                          <span className="text-red-600">-{s.deductions.toFixed(0)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-green-600">{s.earnings.toFixed(0)}</td>
                      <td className="py-2 pr-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {s.approvedDays > 0 && <Badge className="bg-green-600 text-xs">{s.approvedDays}✓</Badge>}
                          {s.pendingDays > 0 && <Badge className="bg-warning-500 text-xs">{s.pendingDays}⏳</Badge>}
                          {s.approvedDays === 0 && s.pendingDays === 0 && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="pt-2" colSpan={2}>Totals ({employeeSummaries.length} employees)</td>
                    <td className="pt-2 text-right">{employeeSummaries.reduce((s, e) => s + e.presentDays, 0)}</td>
                    <td className="pt-2 text-right">{totals.totalHours.toFixed(1)}h</td>
                    <td className="pt-2 text-right text-warning-600">{totals.totalOvertime.toFixed(1)}h</td>
                    <td className="pt-2 text-right text-red-600">{employeeSummaries.reduce((s, e) => s + e.deductions, 0).toFixed(0)}</td>
                    <td className="pt-2 text-right text-green-600">{totals.totalEarnings.toFixed(0)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}