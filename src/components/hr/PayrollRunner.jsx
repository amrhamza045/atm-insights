import { useState } from "react";
import { monthEndDate } from "@/components/utils/timezoneHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { withEmployeePrivate } from "@/components/hr/employeePrivate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, CheckCircle, PoundSterling, Clock, AlertTriangle, Wallet, Edit } from "lucide-react";
import PayrollHandoffPanel from "@/components/hr/payslip/PayrollHandoffPanel";
import PayslipReview from "@/components/hr/payslip/PayslipReview";
import { generatePayslip } from "@/components/hr/payslip/generatePayslip";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import PayrollWithholdingFields from '@/components/hr/PayrollWithholdingFields';
import PayrollFilterPopover from '@/components/hr/payroll/PayrollFilterPopover';
import { EMPTY_PAY_FILTERS, filterPayroll, groupPayroll } from '@/components/hr/payroll/payrollFilters';

// Single net-salary formula used by both Run Payroll and the Edit window.
const netSalary = ({ gross, bonus, deductions, penalties, borrowings }) =>
  Math.max(0, (gross || 0) + (parseFloat(bonus) || 0) - (parseFloat(deductions) || 0) - (penalties || 0) - (borrowings || 0));

export default function PayrollRunner() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [runningPayroll, setRunningPayroll] = useState(false);
  const [editDialog, setEditDialog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filters, setFilters] = useState(EMPTY_PAY_FILTERS);
  const [groupBy, setGroupBy] = useState("none");

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const branch = selectedBranchId ? { branch_id: selectedBranchId } : {};

  // Own cache entry: payroll needs the pay amounts the other HR tabs don't load.
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "payroll"],
    queryFn: () => base44.entities.Employee.filter({ status: "active", ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }).then(excludeSystemAccounts).then(withEmployeePrivate)
  });

  const { data: salaryRecords = [] } = useQuery({
    queryKey: ["salaryRecords", selectedMonth, selectedBranchId],
    queryFn: () => base44.entities.SalaryRecord.filter({ month: `${selectedMonth}-01`, ...branch })
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendanceRecords", selectedMonth, selectedBranchId],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = monthEndDate(year, month);
      return base44.entities.Attendance.filter({ attendance_date: { $gte: startDate, $lte: endDate }, ...branch });
    }
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["salaryPenalties", selectedBranchId],
    queryFn: () => base44.entities.SalaryPenalty.filter(branch, "-incident_date")
  });

  const { data: borrowings = [] } = useQuery({
    queryKey: ["employeeBorrowings", selectedBranchId],
    queryFn: () => base44.entities.EmployeeBorrowing.filter(branch, "-borrow_date")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalaryRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaryRecords"] });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'finance' && ['payroll_position', 'tax_return'].includes(q.queryKey[1]?.action) });
      setEditDialog(null);
    },
    onError: error => toast.error('Payroll changes could not be saved: ' + error.message)
  });

  const getSalaryRecord = (empId) => salaryRecords.find(r => r.employee_id === empId);

  // Fetch active attendance policy
  const { data: policies = [] } = useQuery({
    queryKey: ["attendancePolicies"],
    queryFn: () => base44.entities.AttendancePolicy.list("-created_date"),
  });
  const policy = policies.find(p => p.is_active) || policies[0] || null;
  const requireApproval = policy?.require_approval_for_payroll !== false;

  const calcForEmployee = (emp) => {
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = monthEndDate(year, month);

    const empAttendance = attendanceRecords.filter(a => a.employee_id === emp.id && a.attendance_date >= startDate && a.attendance_date <= endDate);
    const presenceConfirmed = empAttendance.filter(a => !["pending_hr_confirmation", "rejected_hr_confirmation"].includes(a.status));

    // Manual requests never count until HR confirms presence; payroll approval remains separate.
    const validRecords = requireApproval
      ? presenceConfirmed.filter(a => a.review_status === "approved")
      : presenceConfirmed;

    // Sum from approved attendance calculated values (if present)
    const hasApprovedCalc = validRecords.some(a => a.calculated_earnings != null);

    const totalHours = validRecords.reduce((s, a) => s + (a.hours_worked || 0), 0);
    const overtimeHours = validRecords.reduce((s, a) => s + (a.overtime_hours || 0), 0);
    const regularHours = validRecords.reduce((s, a) => s + (a.regular_hours || 0), 0);
    const attendanceDeductions = validRecords.reduce((s, a) => s + (a.deduction_amount || 0), 0);

    const baseSalary = (emp.salary_type === "fixed" || emp.salary_type === "both") ? (emp.fixed_salary || 0) : 0;

    let hourlyEarnings, overtimeEarnings, gross;

    if (hasApprovedCalc) {
      // Use the pre-calculated earnings from approved attendance records
      hourlyEarnings = validRecords.reduce((s, a) => s + (a.regular_earnings || 0), 0);
      overtimeEarnings = validRecords.reduce((s, a) => s + (a.overtime_earnings || 0), 0);
      gross = baseSalary + hourlyEarnings + overtimeEarnings - attendanceDeductions;
    } else {
      // Fallback: legacy calculation for records without approved calc fields
      const scheduledHoursPerDay = emp.scheduled_hours_per_day || 8;
      const workingDays = validRecords.length;
      const scheduledTotal = workingDays * scheduledHoursPerDay;
      const otHours = Math.max(0, totalHours - scheduledTotal);
      const regHours = totalHours - otHours;

      hourlyEarnings = (emp.salary_type === "hourly" || emp.salary_type === "both") ? regHours * (emp.hourly_rate || 0) : 0;
      overtimeEarnings = otHours * (emp.hourly_rate || 0) * 1.5;
      gross = baseSalary + hourlyEarnings + overtimeEarnings;
    }

    const monthPenalties = penalties.filter(p => p.employee_id === emp.id && p.apply_to_month?.startsWith(selectedMonth) && p.status === "pending");
    const penaltyTotal = monthPenalties.reduce((s, p) => s + (p.amount || 0), 0);

    const activeBorrowings = borrowings.filter(b => b.employee_id === emp.id && b.status === "active" && (!b.request_status || b.request_status === "approved") && b.payout_status !== "unpaid" && b.start_repayment_month?.slice(0, 7) <= selectedMonth);
    const borrowingDeduction = activeBorrowings.reduce((s, b) => s + (b.amount_per_installment || 0), 0);

    const net = gross - penaltyTotal - borrowingDeduction;

    return { baseSalary, hourlyEarnings, overtimeHours, overtimeEarnings, totalHours, regularHours, penaltyTotal, borrowingDeduction, gross, net, monthPenalties, activeBorrowings, validRecords, attendanceDeductions, approvedDays: validRecords.length, totalDays: empAttendance.length };
  };

  const runPayroll = async () => {
    setRunningPayroll(true);
    try {
      const monthPayslips = await base44.entities.Payslip.filter({ month: `${selectedMonth}-01` });
      const brandName = (await base44.entities.RestaurantInfo.list())[0]?.brand_name;
      for (const emp of employees) {
        const calc = calcForEmployee(emp);
        const existing = getSalaryRecord(emp.id);
        const data = {
          employee_id: emp.id,
          employee_name: emp.name,
          month: `${selectedMonth}-01`,
          base_salary: calc.baseSalary,
          hourly_earnings: calc.hourlyEarnings,
          overtime_hours: calc.overtimeHours,
          overtime_earnings: calc.overtimeEarnings,
          total_hours: calc.totalHours,
          regular_hours: calc.regularHours,
          attendance_deductions: calc.attendanceDeductions,
          approved_days: calc.approvedDays,
          penalty_deductions: calc.penaltyTotal,
          borrowing_deductions: calc.borrowingDeduction,
          gross_salary: calc.gross,
          net_salary: netSalary({ gross: calc.gross, bonus: existing?.bonus, deductions: existing?.deductions, penalties: calc.penaltyTotal, borrowings: calc.borrowingDeduction }),
          payment_status: existing?.payment_status || "pending",
          branch_id: emp.branch_id || selectedBranchId,
          branch_name: emp.branch_name || selectedBranch?.name
        };
        if (existing?.id) {
          await base44.entities.SalaryRecord.update(existing.id, data);
        } else {
          await base44.entities.SalaryRecord.create(data);
        }
        // Build the itemised PDF payslip (kept pending review). Skipped on re-runs so the
        // penalty/advance lines captured at first close are not lost.
        if (!monthPayslips.some(p => p.employee_id === emp.id)) {
          await generatePayslip({ emp, rec: { ...data, bonus: existing?.bonus, deductions: existing?.deductions }, calc, month: selectedMonth, existing: null, brandName });
        }
        // Mark penalties as applied
        for (const p of calc.monthPenalties) {
          await base44.entities.SalaryPenalty.update(p.id, { status: "applied" });
        }
        // Update borrowing repaid amounts
        for (const b of calc.activeBorrowings) {
          const newRepaid = (b.total_repaid || 0) + (b.amount_per_installment || 0);
          const newRemaining = Math.max(0, (b.remaining_balance || 0) - (b.amount_per_installment || 0));
          const newStatus = newRemaining <= 0 ? "completed" : "active";
          await base44.entities.EmployeeBorrowing.update(b.id, { total_repaid: newRepaid, remaining_balance: newRemaining, status: newStatus });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["salaryRecords"] });
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      queryClient.invalidateQueries({ queryKey: ["salaryPenalties"] });
      queryClient.invalidateQueries({ queryKey: ["employeeBorrowings"] });
      toast.success(`Payroll for ${selectedMonth} calculated successfully!`);
    } catch (e) {
      toast.error("Payroll run failed: " + e.message);
    }
    setRunningPayroll(false);
  };

  const openEdit = (emp) => {
    const rec = getSalaryRecord(emp.id);
    if (!rec) return;
    setEditForm({ bonus: rec.bonus || 0, deductions: rec.deductions || 0, notes: rec.notes || "", payment_status: rec.payment_status, tax_withheld_amount: rec.tax_withheld_amount ?? '', tax_withholding_note: rec.tax_withholding_note || '' });
    setEditDialog({ emp, rec });
  };

  const editNet = () => netSalary({
    gross: editDialog.rec.gross_salary, bonus: editForm.bonus, deductions: editForm.deductions,
    penalties: editDialog.rec.penalty_deductions, borrowings: editDialog.rec.borrowing_deductions,
  });

  const saveEdit = () => {
    const withheld = editForm.tax_withheld_amount === '' ? null : Number(editForm.tax_withheld_amount);
    if (withheld !== null && (!Number.isFinite(withheld) || withheld < 0 || withheld > 1e12 || Math.abs(withheld * 100 - Math.round(withheld * 100)) >= 0.001)) {
      toast.error('Enter a non-negative withholding amount with at most two decimals, or leave it blank if unknown.');
      return;
    }
    const earningsChanged = Number(editForm.bonus || 0) !== Number(editDialog.rec.bonus || 0) || Number(editForm.deductions || 0) !== Number(editDialog.rec.deductions || 0);
    const net = earningsChanged ? editNet() : editDialog.rec.net_salary;
    updateMutation.mutate({ id: editDialog.rec.id, data: { bonus: parseFloat(editForm.bonus || 0), deductions: parseFloat(editForm.deductions || 0), net_salary: net, notes: editForm.notes, payment_status: editForm.payment_status, tax_withheld_amount: withheld, tax_withholding_note: editForm.tax_withholding_note.trim() } });
  };

  const totalPayroll = salaryRecords.reduce((s, r) => s + (r.net_salary || 0), 0);
  const paid = salaryRecords.filter(r => r.payment_status === "paid").length;
  const payrollGroups = groupPayroll(
    filterPayroll(employees.map(emp => ({ emp, rec: getSalaryRecord(emp.id) })), filters),
    groupBy
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><PoundSterling className="w-5 h-5" /> Payroll Runner</h3>
        <div className="flex gap-2 items-center">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44" />
          <PayrollFilterPopover filters={filters} setFilters={setFilters} groupBy={groupBy} setGroupBy={setGroupBy} employees={employees} />
          <Button onClick={runPayroll} disabled={runningPayroll} className="gap-2 bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4" />{runningPayroll ? "Running..." : "Run Payroll"}
          </Button>
        </div>
      </div>

      <PayrollHandoffPanel month={selectedMonth} branchId={selectedBranchId} salaryRecords={salaryRecords} />
      <PayslipReview month={selectedMonth} branchId={selectedBranchId} />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-slate-500">Total Payroll</p><p className="text-xl font-bold text-green-600">EGP {totalPayroll.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-slate-500">Employees</p><p className="text-xl font-bold">{employees.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-slate-500">Paid</p><p className="text-xl font-bold text-blue-600">{paid}/{salaryRecords.length}</p></CardContent></Card>
      </div>

      {/* Employee Cards */}
      {payrollGroups.map(g => (
      <div key={g.label || "all"} className="space-y-3">
        {g.label && (
          <div className="flex justify-between bg-slate-100 rounded px-3 py-1.5 text-sm font-semibold text-slate-700">
            <span className="capitalize">{g.label} ({g.items.length})</span>
            <span className="text-green-600">Net EGP {g.net.toFixed(2)}</span>
          </div>
        )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {g.items.map(({ emp, rec }) => {
          const calc = calcForEmployee(emp);
          return (
            <Card key={emp.id} className={rec ? "border-green-200" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                  </div>
                  <Badge className={rec?.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-warning-100 text-warning-700"}>
                    {rec?.payment_status || "not run"}
                  </Badge>
                </div>
                {rec ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600"><span className="flex items-center gap-1"><Clock className="w-3 h-3" />Hours ({rec.approved_days || 0}d):</span><span>{rec.total_hours?.toFixed(1)}h {rec.overtime_hours > 0 && <span className="text-warning-600">+{rec.overtime_hours?.toFixed(1)}OT</span>}</span></div>
                    <div className="flex justify-between text-slate-600"><span>Gross:</span><span>EGP {rec.gross_salary?.toFixed(2)}</span></div>
                    {rec.penalty_deductions > 0 && <div className="flex justify-between text-red-600"><span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Penalties:</span><span>-EGP {rec.penalty_deductions?.toFixed(2)}</span></div>}
                    {rec.borrowing_deductions > 0 && <div className="flex justify-between text-red-600"><span className="flex items-center gap-1"><Wallet className="w-3 h-3" />Borrowing:</span><span>-EGP {rec.borrowing_deductions?.toFixed(2)}</span></div>}
                    {rec.bonus > 0 && <div className="flex justify-between text-green-600"><span>Bonus:</span><span>+EGP {rec.bonus?.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-muted-foreground"><span>Tax withheld (reporting):</span><span>{rec.tax_withheld_amount == null ? 'Not recorded' : `EGP ${rec.tax_withheld_amount.toFixed(2)}`}</span></div>
                    <div className="border-t pt-1 flex justify-between font-bold"><span>Net:</span><span className="text-green-600">EGP {rec.net_salary?.toFixed(2)}</span></div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 space-y-1 py-1">
                    <p>Preview: Gross ≈ EGP {calc.gross.toFixed(2)}</p>
                    {calc.penaltyTotal > 0 && <p className="text-red-500">Penalties: -EGP {calc.penaltyTotal.toFixed(2)}</p>}
                    {calc.borrowingDeduction > 0 && <p className="text-red-500">Borrowing: -EGP {calc.borrowingDeduction.toFixed(2)}</p>}
                  </div>
                )}
                {rec && (
                  <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => openEdit(emp)}>
                    <Edit className="w-3 h-3" /> Edit / Adjust Tax
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
      ))}
      {payrollGroups.every(g => g.items.length === 0) && <p className="text-slate-400 text-center py-8">No employees match the filters</p>}

      {/* Edit Dialog */}
      {editDialog && (
        <Dialog open onOpenChange={() => setEditDialog(null)}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editDialog.emp.name} — {selectedMonth}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm bg-slate-50 rounded p-3">
              <div className="flex justify-between"><span>Base Salary:</span><span>EGP {editDialog.rec.base_salary?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Hourly Earnings:</span><span>EGP {editDialog.rec.hourly_earnings?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Overtime ({editDialog.rec.overtime_hours?.toFixed(1)}h):</span><span>EGP {editDialog.rec.overtime_earnings?.toFixed(2)}</span></div>
              {editDialog.rec.attendance_deductions > 0 && <div className="flex justify-between text-red-600"><span>Late/Early Leave:</span><span>-EGP {editDialog.rec.attendance_deductions?.toFixed(2)}</span></div>}
              <div className="flex justify-between text-red-600"><span>Penalties:</span><span>-EGP {editDialog.rec.penalty_deductions?.toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600"><span>Borrowing:</span><span>-EGP {editDialog.rec.borrowing_deductions?.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>Gross:</span><span>EGP {editDialog.rec.gross_salary?.toFixed(2)}</span></div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bonus</Label><Input type="number" value={editForm.bonus} onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))} /></div>
                <div><Label>Extra Deductions</Label><Input type="number" value={editForm.deductions} onChange={e => setEditForm(f => ({ ...f, deductions: e.target.value }))} /></div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <span className="text-sm text-slate-600">Net Salary: </span>
                <span className="text-xl font-bold text-green-600">EGP {editNet().toFixed(2)}</span>
              </div>
              <div><Label>Payment Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={editForm.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{editForm.payment_status === "paid" ? "Paid" : "Pending Payout"}</Badge>
                  <span className="text-xs text-muted-foreground">Updated automatically by Finance in Payouts</span>
                </div>
              </div>
              <PayrollWithholdingFields value={editForm.tax_withheld_amount} note={editForm.tax_withholding_note} onChange={(key, value) => setEditForm(f => ({ ...f, [key]: value }))}/>
              <div><Label>Notes</Label><Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={updateMutation.isPending}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}