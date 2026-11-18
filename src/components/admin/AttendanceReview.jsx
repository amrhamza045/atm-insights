import { useState, useMemo } from "react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { withEmployeePrivate } from "@/components/hr/employeePrivate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertCircle, CheckCircle2, AlertTriangle, Calendar,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Users
} from "lucide-react";
import { toast } from "sonner";
import { calculateAttendance, DEFAULT_SHIFT_PRESETS } from "@/components/utils/attendanceCalculator";
import { useBranch } from "@/components/branches/BranchContext";
import { useHasPermission } from "@/components/permissions/PermissionsContext";
import AttendanceExceptionsPanel from "@/components/admin/attendance/AttendanceExceptionsPanel";
import AttendanceFilterPopover from "@/components/admin/attendance/AttendanceFilterPopover";
import { EMPTY_ATT_FILTERS, filterRecords, filterMissing, groupRecords } from "@/components/admin/attendance/attendanceFilters";
import ApprovalsCenterNotice from "@/components/approvals/ApprovalsCenterNotice";

export default function AttendanceReview() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(companyToday());
  const [reviewDialog, setReviewDialog] = useState(null);
  const [selectedShiftLabel, setSelectedShiftLabel] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [filters, setFilters] = useState(EMPTY_ATT_FILTERS);
  const [groupBy, setGroupBy] = useState("none");
  const { selectedBranchId } = useBranch();
  const canApproveAttendance = useHasPermission("hr_attendance_approve");

  // Fetch active policy
  const { data: policies = [] } = useQuery({
    queryKey: ["attendancePolicies"],
    queryFn: () => base44.entities.AttendancePolicy.list("-created_date"),
  });
  const policy = policies.find(p => p.is_active) || policies[0] || null;

  // Fetch attendance for selected date
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["attendanceByDate", selectedDate, selectedBranchId],
    queryFn: () => base44.entities.Attendance.filter({ attendance_date: selectedDate, ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) }, "-created_date"),
  });

  // Fetch employees (for hourly rate + name lookup). Own cache entry: approving saves pay from these rates.
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "attendance-review"],
    queryFn: () => base44.entities.Employee.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, "-created_date").then(excludeSystemAccounts).then(withEmployeePrivate),
  });

  // Fetch admin user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Merge attendance with employee data
  const enrichedRecords = useMemo(() => {
    return attendanceRecords.map(record => {
      const employee = employees.find(e => e.id === record.employee_id);
      return {
        ...record,
        employeeName: employee?.name || record.employee_name || "Unknown",
        employeeEmail: employee?.email || "",
        hourlyRate: employee?.hourly_rate || 0,
        salaryType: employee?.salary_type || "hourly",
        department: employee?.department || "",
        position: employee?.position || "",
      };
    });
  }, [attendanceRecords, employees]);

  const pendingHRRecords = enrichedRecords.filter((record) => record.status === "pending_hr_confirmation");
  const reviewRecords = enrichedRecords.filter((record) => !["pending_hr_confirmation", "rejected_hr_confirmation"].includes(record.status));

  // Presence confirmation is separate from the normal daily/payroll review.
  const stats = useMemo(() => {
    const pending = reviewRecords.filter(r => r.review_status === "pending" || !r.review_status).length;
    const approved = reviewRecords.filter(r => r.review_status === "approved").length;
    const rejected = reviewRecords.filter(r => r.review_status === "rejected").length;
    return { pending, approved, rejected, total: reviewRecords.length };
  }, [reviewRecords]);

  const shiftPresets = policy?.shift_presets || DEFAULT_SHIFT_PRESETS;

  const approveMutation = useMutation({
    mutationFn: async ({ record, shiftPreset, notes }) => {
      const latest = await base44.entities.Attendance.get(record.id);
      if (["pending_hr_confirmation", "rejected_hr_confirmation"].includes(latest.status)) {
        throw new Error("HR must confirm presence before payroll approval.");
      }
      if (!latest.sign_in_time || !latest.sign_out_time) {
        throw new Error("The employee must sign out before earnings can be approved. Reopen the review after sign-out.");
      }
      const start = new Date(latest.sign_in_time).getTime();
      const end = new Date(latest.sign_out_time).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        throw new Error("Attendance times are invalid. Correct them before approving.");
      }
      const employee = employees.find(e => e.id === latest.employee_id);
      const hourlyRate = employee?.hourly_rate || 0;
      const calc = calculateAttendance(
        policy,
        shiftPreset,
        latest.sign_in_time,
        latest.sign_out_time,
        hourlyRate
      );

      // Keep a waived penalty waived when the record is re-approved/updated.
      const waived = latest.exception_waived
        ? { deduction_amount: 0, calculated_earnings: calc.calculated_earnings + (calc.deduction_amount || 0) }
        : {};
      return base44.entities.Attendance.update(record.id, {
        ...calc,
        ...waived,
        admin_approved: true,
        review_status: "approved",
        approved_by: currentUser?.email || "admin",
        approved_date: new Date().toISOString(),
        reviewer_notes: notes || "",
        notes: notes ? `${latest.notes || ""}\n[Review: ${notes}]`.trim() : (latest.notes || ""),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceByDate"] });
      queryClient.invalidateQueries({ queryKey: ["todayAttendance"] });
      toast.success("Attendance approved");
      setReviewDialog(null);
    },
    onError: (e) => toast.error("Failed to approve: " + e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ record, notes }) =>
      base44.entities.Attendance.update(record.id, {
        admin_approved: false,
        review_status: "rejected",
        reviewer_notes: notes,
        approved_by: currentUser?.email || "admin",
        approved_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceByDate"] });
      toast.success("Attendance rejected");
      setReviewDialog(null);
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: async (employee) => {
      return base44.entities.Attendance.create({
        employee_id: employee.id,
        employee_name: employee.name,
        attendance_date: selectedDate,
        status: "no_show",
        review_status: "approved",
        admin_approved: true,
        approved_by: currentUser?.email || "admin",
        approved_date: new Date().toISOString(),
        deduction_amount: policy?.absence_penalty_amount || 0,
        calculated_earnings: -(policy?.absence_penalty_amount || 0),
        deduction_breakdown: `Absence: -${(policy?.absence_penalty_amount || 0).toFixed(2)} EGP`,
        hours_worked: 0,
        reviewer_notes: "Marked as no-show by admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceByDate"] });
      toast.success("Marked as no-show");
    },
  });

  const handleOpenReview = async (record) => {
    const latest = await base44.entities.Attendance.get(record.id);
    setReviewDialog({ ...record, ...latest });
    setSelectedShiftLabel(latest.assigned_shift_label || "");
    setReviewerNotes(latest.reviewer_notes || "");
  };

  const handleApprove = () => {
    if (!reviewDialog) return;
    if (!selectedShiftLabel) {
      toast.error("Please select a shift schedule");
      return;
    }
    const shiftPreset = shiftPresets.find(p => p.label === selectedShiftLabel);
    if (!shiftPreset) {
      toast.error("Invalid shift selection");
      return;
    }
    approveMutation.mutate({ record: reviewDialog, shiftPreset, notes: reviewerNotes });
  };

  const handleReject = () => {
    if (!reviewDialog) return;
    rejectMutation.mutate({ record: reviewDialog, notes: reviewerNotes });
  };

  // Get the live calculation preview for the dialog
  const previewCalc = useMemo(() => {
    if (!reviewDialog || !selectedShiftLabel) return null;
    const shiftPreset = shiftPresets.find(p => p.label === selectedShiftLabel);
    if (!shiftPreset) return null;
    const employee = employees.find(e => e.id === reviewDialog.employee_id);
    return calculateAttendance(
      policy,
      shiftPreset,
      reviewDialog.sign_in_time,
      reviewDialog.sign_out_time,
      employee?.hourly_rate || 0
    );
  }, [reviewDialog, selectedShiftLabel, shiftPresets, policy, employees]);

  const shiftDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const getStatusBadge = (record) => {
    if (record.review_status === "approved") return <Badge className="bg-green-600">Approved</Badge>;
    if (record.review_status === "rejected") return <Badge className="bg-red-600">Rejected</Badge>;
    return <Badge className="bg-warning-500">Pending</Badge>;
  };

  // Employees with no attendance record for the date
  const missingEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.status === "active" &&
      !reviewRecords.some(r => r.employee_id === emp.id) &&
      !pendingHRRecords.some(r => r.employee_id === emp.id)
    );
  }, [employees, reviewRecords, pendingHRRecords]);

  const filteredRecords = filterRecords(reviewRecords, filters);
  const filteredMissing = filterMissing(missingEmployees, filters);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const shiftOptions = uniq([...shiftPresets.map(p => p.label), ...reviewRecords.map(r => r.assigned_shift_label)]);
  const departmentOptions = uniq(employees.map(e => e.department));
  const positionOptions = uniq(employees.map(e => e.position));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Attendance Review & Approval</h2>
          <p className="text-sm text-slate-500">Approve daily attendance with shift assignment and auto-calculated deductions</p>
        </div>
        <div className="flex items-center gap-2">
          {policy && (
            <Badge variant="outline" className="text-xs">
              Policy: {policy.policy_name} | OT {policy.overtime_rate_multiplier}x | Grace {policy.late_grace_minutes}min
            </Badge>
          )}
          <AttendanceFilterPopover
            filters={filters} setFilters={setFilters} groupBy={groupBy} setGroupBy={setGroupBy}
            shifts={shiftOptions} departments={departmentOptions} positions={positionOptions}
          />
        </div>
      </div>

      {/* Policy warning */}
      {!policy && (
        <Card className="border-warning-300 bg-warning-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning-600" />
            <div>
              <p className="text-sm font-medium text-warning-800">No active attendance policy</p>
              <p className="text-xs text-warning-700">Create a policy in the Policy tab to enable shift presets and deduction calculations.</p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-slate-500">Total Records</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-slate-500">Pending</p><p className="text-xl font-bold text-warning-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-slate-500">Approved</p><p className="text-xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-slate-500">No Check-in</p><p className="text-xl font-bold text-red-600">{missingEmployees.length}</p></CardContent></Card>
      </div>

      {pendingHRRecords.length > 0 && <ApprovalsCenterNotice what={`${pendingHRRecords.length} attendance confirmation(s)`} />}

      <AttendanceExceptionsPanel records={reviewRecords} date={selectedDate} currentUser={currentUser} canReview={canApproveAttendance} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : reviewRecords.length === 0 && pendingHRRecords.length === 0 && missingEmployees.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No attendance records for this date</p>
        </Card>
      ) : (
        <>
          {/* Attendance Records */}
          {filteredRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Attendance Records ({filteredRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupRecords(filteredRecords, groupBy).map(g => (
                  <div key={g.label || "all"} className="space-y-3">
                    {g.label && <p className="text-sm font-semibold text-slate-700 bg-slate-100 rounded px-3 py-1.5">{g.label} ({g.items.length})</p>}
                    {g.items.map(record => {
                  const isApproved = record.review_status === "approved";
                  return (
                    <div
                      key={record.id}
                      className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                        isApproved ? "border-green-200 bg-green-50/30" :
                        record.review_status === "rejected" ? "border-red-200 bg-red-50/30" :
                        "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{record.employeeName}</h4>
                            {getStatusBadge(record)}
                            {record.assigned_shift_label && (
                              <Badge variant="outline" className="text-xs">{record.assigned_shift_label}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                            {record.sign_in_time && (
                              <div className="p-2 bg-slate-50 rounded">
                                <p className="text-slate-500">Sign In</p>
                                <p className="font-medium">{new Date(record.sign_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                            )}
                            {record.sign_out_time && (
                              <div className="p-2 bg-slate-50 rounded">
                                <p className="text-slate-500">Sign Out</p>
                                <p className="font-medium">{new Date(record.sign_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                            )}
                            {record.hours_worked != null && (
                              <div className="p-2 bg-slate-50 rounded">
                                <p className="text-slate-500">Hours</p>
                                <p className="font-medium">{record.hours_worked.toFixed(2)}h</p>
                              </div>
                            )}
                            {isApproved && record.calculated_earnings != null && (
                              <div className="p-2 bg-slate-50 rounded">
                                <p className="text-slate-500">Earnings</p>
                                <p className="font-medium text-green-600">{record.calculated_earnings.toFixed(2)} EGP</p>
                              </div>
                            )}
                          </div>
                          {isApproved && record.deduction_amount > 0 && (
                            <p className="text-xs text-red-600 mt-1">{record.deduction_breakdown}</p>
                          )}
                          {isApproved && record.overtime_hours > 0 && (
                            <p className="text-xs text-warning-600 mt-1">Overtime: {record.overtime_hours.toFixed(2)}h (+{record.overtime_earnings.toFixed(2)} EGP)</p>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleOpenReview(record)} className="whitespace-nowrap">
                          {isApproved ? "View / Edit" : "Review & Approve"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Missing Employees */}
          {filteredMissing.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" /> No Check-in ({filteredMissing.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-slate-500 mb-2">These active employees have no attendance record for this date. Mark as no-show if needed.</p>
                {filteredMissing.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-2 border rounded bg-red-50/30">
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.position} | {emp.salary_type}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => markNoShowMutation.mutate(emp)}
                      disabled={markNoShowMutation.isPending}
                    >
                      Mark No-Show
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Approve Attendance</DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="p-3 bg-slate-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{reviewDialog.employeeName}</p>
                    <p className="text-xs text-slate-600">{reviewDialog.attendance_date}</p>
                  </div>
                  {(() => {
                    const emp = employees.find(e => e.id === reviewDialog.employee_id);
                    return emp && (
                      <div className="text-right text-xs text-slate-600">
                        <p>{emp.position}</p>
                        <p>Rate: {emp.hourly_rate?.toFixed(2) || "0"} EGP/hr</p>
                        <p>Type: {emp.salary_type}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Actual Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500">Sign In</p>
                  <p className="font-semibold text-sm">
                    {reviewDialog.sign_in_time ? new Date(reviewDialog.sign_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "—"}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-500">Sign Out</p>
                  <p className="font-semibold text-sm">
                    {reviewDialog.sign_out_time ? new Date(reviewDialog.sign_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Not signed out"}
                  </p>
                </div>
              </div>

              {/* Shift Dropdown */}
              <div>
                <Label className="mb-2 block">Assign Shift Schedule</Label>
                <Select value={selectedShiftLabel} onValueChange={setSelectedShiftLabel}>
                  <SelectTrigger><SelectValue placeholder="Select shift schedule..." /></SelectTrigger>
                  <SelectContent>
                    {shiftPresets.map(preset => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label} ({preset.start_time} - {preset.end_time})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Select the shift that applies to this employee for this day. Calculations update automatically.
                </p>
              </div>

              {/* Live Calculation Preview */}
              {previewCalc && (
                <div className="border-2 border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Calculation Preview
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Expected Hours:</span><span className="font-medium">{previewCalc.shift_expected_hours.toFixed(2)}h</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Regular Hours:</span><span className="font-medium">{previewCalc.regular_hours.toFixed(2)}h</span></div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Late Minutes:</span>
                      <span className={`font-medium ${previewCalc.late_minutes > 0 ? "text-red-600" : ""}`}>
                        {previewCalc.late_minutes} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Early Leave:</span>
                      <span className={`font-medium ${previewCalc.early_leave_minutes > 0 ? "text-red-600" : ""}`}>
                        {previewCalc.early_leave_minutes} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Overtime:</span>
                      <span className={`font-medium ${previewCalc.overtime_hours > 0 ? "text-warning-600" : ""}`}>
                        {previewCalc.overtime_hours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-600">Total Worked:</span><span className="font-medium">{previewCalc.hours_worked.toFixed(2)}h</span></div>
                  </div>
                  <div className="border-t pt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Regular Earnings:</span>
                      <span className="font-medium text-green-600">+{previewCalc.regular_earnings.toFixed(2)} EGP</span>
                    </div>
                    {previewCalc.overtime_earnings > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Overtime Earnings:</span>
                        <span className="font-medium text-warning-600">+{previewCalc.overtime_earnings.toFixed(2)} EGP</span>
                      </div>
                    )}
                    {previewCalc.deduction_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Deductions:</span>
                        <span className="font-medium text-red-600">-{previewCalc.deduction_amount.toFixed(2)} EGP</span>
                      </div>
                    )}
                    {previewCalc.deduction_breakdown && (
                      <p className="text-xs text-red-500 pl-4">{previewCalc.deduction_breakdown}</p>
                    )}
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center bg-white rounded p-2">
                    <span className="font-semibold">Net Day Earnings:</span>
                    <span className="text-lg font-bold text-green-600">{previewCalc.calculated_earnings.toFixed(2)} EGP</span>
                  </div>
                </div>
              )}

              {/* Reviewer Notes */}
              <div>
                <Label>Reviewer Notes (optional)</Label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Add notes about this attendance record..."
                  className="w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t">
                {reviewDialog.review_status === "approved" && (
                  <Button variant="ghost" onClick={() => setReviewDialog(null)}>Close</Button>
                )}
                {reviewDialog.review_status !== "approved" && (
                  <>
                    <Button variant="outline" onClick={handleReject} disabled={rejectMutation.isPending} className="text-red-600 border-red-300 hover:bg-red-50">
                      Reject
                    </Button>
                    <Button onClick={handleApprove} disabled={approveMutation.isPending || !selectedShiftLabel} className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {approveMutation.isPending ? "Approving..." : "Approve & Save"}
                    </Button>
                  </>
                )}
                {reviewDialog.review_status === "approved" && (
                  <Button onClick={handleApprove} disabled={approveMutation.isPending || !selectedShiftLabel} className="gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {approveMutation.isPending ? "Updating..." : "Update"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}