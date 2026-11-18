import { useState, useMemo } from "react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Users, AlertTriangle,
  CheckCircle2, TrendingUp, Download
} from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

export default function DailyAttendanceSummary() {
  const [selectedDate, setSelectedDate] = useState(companyToday());
  const { selectedBranchId } = useBranch();

  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["attendanceByDate", selectedDate, selectedBranchId],
    queryFn: () => base44.entities.Attendance.filter({ attendance_date: selectedDate, ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) }, "-created_date"),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "attendance"],
    queryFn: async () => excludeSystemAccounts(await base44.entities.Employee.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, "-created_date")),
  });

  // Merge attendance with employees for a complete picture
  const summary = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === "active");
    const workedRecords = attendanceRecords.filter(r => r.status !== "no_show" && !["pending_hr_confirmation", "rejected_hr_confirmation"].includes(r.status));

    // Employees who have attendance records
    const withRecords = workedRecords.map(record => {
      const employee = employees.find(e => e.id === record.employee_id);
      return {
        ...record,
        employeeName: employee?.name || record.employee_name || "Unknown",
        position: employee?.position || "",
        hasSignIn: !!record.sign_in_time,
        hasSignOut: !!record.sign_out_time,
        hours: record.hours_worked || 0,
      };
    });

    // Active employees with no attendance record at all
    const noShow = attendanceRecords.filter(r => r.status === "no_show");
    const noShowIds = new Set(noShow.map(r => r.employee_id));
    const missingIds = new Set(workedRecords.map(r => r.employee_id));

    const absentEmployees = activeEmployees
      .filter(emp => !missingIds.has(emp.id) && !noShowIds.has(emp.id))
      .map(emp => ({
        employee_id: emp.id,
        employeeName: emp.name,
        position: emp.position || "",
        status: "absent",
        hasSignIn: false,
        hasSignOut: false,
        hours: 0,
      }));

    // Records with missing sign-in or sign-out
    const incomplete = withRecords.filter(r => !r.hasSignIn || !r.hasSignOut);

    // Totals
    const totalHours = withRecords.reduce((s, r) => s + (r.hours || 0), 0);
    const totalOvertime = withRecords.reduce((s, r) => s + (r.overtime_hours || 0), 0);
    const totalEarnings = withRecords.reduce((s, r) => s + (r.calculated_earnings || 0), 0);

    return {
      withRecords: withRecords.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      incomplete,
      absentEmployees: absentEmployees.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      noShow,
      stats: {
        totalPresent: withRecords.length,
        totalAbsent: absentEmployees.length + noShow.length,
        totalHours,
        totalOvertime,
        totalEarnings,
        incompleteCount: incomplete.length,
      },
    };
  }, [attendanceRecords, employees]);

  const shiftDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const handleExport = () => {
    const dateLabel = new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    let csv = `Daily Attendance Summary - ${dateLabel}\n\n`;
    csv += `SUMMARY\n`;
    csv += `Present,${summary.stats.totalPresent}\n`;
    csv += `Absent/No-Show,${summary.stats.totalAbsent}\n`;
    csv += `Total Hours,${summary.stats.totalHours.toFixed(2)}\n`;
    csv += `Overtime Hours,${summary.stats.totalOvertime.toFixed(2)}\n`;
    csv += `Total Earnings (EGP),${summary.stats.totalEarnings.toFixed(2)}\n`;
    csv += `Incomplete Records,${summary.stats.incompleteCount}\n\n`;

    csv += `EMPLOYEES WHO WORKED\n`;
    csv += `Name,Position,Sign In,Sign Out,Hours Worked,Overtime,Earnings,Status,Shift,Approved\n`;
    summary.withRecords.forEach(r => {
      csv += [
        `"${r.employeeName}"`,
        `"${r.position}"`,
        r.sign_in_time ? new Date(r.sign_in_time).toLocaleTimeString() : "MISSING",
        r.sign_out_time ? new Date(r.sign_out_time).toLocaleTimeString() : "MISSING",
        (r.hours || 0).toFixed(2),
        (r.overtime_hours || 0).toFixed(2),
        (r.calculated_earnings || 0).toFixed(2),
        r.status || "",
        r.assigned_shift_label || "",
        r.review_status || "pending",
      ].join(",") + "\n";
    });

    csv += `\nABSENT / NO-SHOW\n`;
    csv += `Name,Position,Reason\n`;
    summary.absentEmployees.forEach(r => {
      csv += `"${r.employeeName}","${r.position}","No check-in record"\n`;
    });
    summary.noShow.forEach(r => {
      csv += `"${r.employee_name || "Unknown"}","","Marked as no-show"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_summary_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Daily Attendance Summary</h2>
          <p className="text-sm text-slate-500">Overview of who worked, total hours, and missing check-in/out events</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2" disabled={summary.withRecords.length === 0 && summary.absentEmployees.length === 0}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(shiftDate(-1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(shiftDate(1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(companyToday())}>
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Users className="w-4 h-4 mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">Present</p>
          <p className="text-xl font-bold text-green-600">{summary.stats.totalPresent}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-4 h-4 mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">Absent</p>
          <p className="text-xl font-bold text-red-600">{summary.stats.totalAbsent}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-4 h-4 mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">Total Hours</p>
          <p className="text-xl font-bold">{summary.stats.totalHours.toFixed(1)}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">Overtime</p>
          <p className="text-xl font-bold text-warning-600">{summary.stats.totalOvertime.toFixed(1)}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="w-4 h-4 mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">Earnings</p>
          <p className="text-xl font-bold text-green-600">{summary.stats.totalEarnings.toFixed(0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-4 h-4 mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">Incomplete</p>
          <p className="text-xl font-bold text-warning-600">{summary.stats.incompleteCount}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : summary.withRecords.length === 0 && summary.absentEmployees.length === 0 && summary.noShow.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No attendance records for this date</p>
        </Card>
      ) : (
        <>
          {/* Missing Check-in/Check-out Alert */}
          {summary.incomplete.length > 0 && (
            <Card className="border-warning-300 bg-warning-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-warning-800">
                  <AlertTriangle className="w-4 h-4" /> Missing Sign-in / Sign-out ({summary.incomplete.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.incomplete.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-2 border rounded bg-white">
                    <div>
                      <p className="text-sm font-medium">{record.employeeName}</p>
                      <div className="flex gap-3 mt-1">
                        {!record.hasSignIn && <Badge variant="destructive" className="text-xs">No Sign-in</Badge>}
                        {!record.hasSignOut && <Badge variant="destructive" className="text-xs">No Sign-out</Badge>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 text-right">
                      {record.hasSignIn && <p>In: {new Date(record.sign_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                      {record.hasSignOut && <p>Out: {new Date(record.sign_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Employees Who Worked */}
          {summary.withRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Employees Who Worked ({summary.withRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500">
                        <th className="pb-2 pr-3">Name</th>
                        <th className="pb-2 pr-3">Sign In</th>
                        <th className="pb-2 pr-3">Sign Out</th>
                        <th className="pb-2 pr-3 text-right">Hours</th>
                        <th className="pb-2 pr-3 text-right">Overtime</th>
                        <th className="pb-2 pr-3 text-right">Earnings</th>
                        <th className="pb-2 pr-3">Shift</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.withRecords.map(record => (
                        <tr key={record.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{record.employeeName}</td>
                          <td className="py-2 pr-3">
                            {record.hasSignIn ? (
                              <span>{new Date(record.sign_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Missing</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            {record.hasSignOut ? (
                              <span>{new Date(record.sign_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Missing</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right font-medium">{(record.hours || 0).toFixed(2)}h</td>
                          <td className="py-2 pr-3 text-right">
                            {(record.overtime_hours || 0) > 0 ? (
                              <span className="text-warning-600 font-medium">{(record.overtime_hours || 0).toFixed(2)}h</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {record.calculated_earnings != null ? (
                              <span className="text-green-600 font-medium">{record.calculated_earnings.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            {record.assigned_shift_label ? (
                              <Badge variant="outline" className="text-xs">{record.assigned_shift_label}</Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2">
                            {record.review_status === "approved" ? (
                              <Badge className="bg-green-600 text-xs">Approved</Badge>
                            ) : record.review_status === "rejected" ? (
                              <Badge className="bg-red-600 text-xs">Rejected</Badge>
                            ) : (
                              <Badge className="bg-warning-500 text-xs">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="pt-2" colSpan={3}>Total ({summary.withRecords.length} employees)</td>
                        <td className="pt-2 text-right">{summary.stats.totalHours.toFixed(2)}h</td>
                        <td className="pt-2 text-right text-warning-600">{summary.stats.totalOvertime.toFixed(2)}h</td>
                        <td className="pt-2 text-right text-green-600">{summary.stats.totalEarnings.toFixed(2)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Absent / No-Show */}
          {(summary.absentEmployees.length > 0 || summary.noShow.length > 0) && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" /> Absent & No-Show ({summary.absentEmployees.length + summary.noShow.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.absentEmployees.map(emp => (
                  <div key={emp.employee_id} className="flex items-center justify-between p-2 border rounded bg-red-50/30">
                    <div>
                      <p className="text-sm font-medium">{emp.employeeName}</p>
                      <p className="text-xs text-slate-500">{emp.position}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">No check-in</Badge>
                  </div>
                ))}
                {summary.noShow.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-2 border rounded bg-red-50/30">
                    <div>
                      <p className="text-sm font-medium">{record.employee_name || "Unknown"}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">No-show</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}