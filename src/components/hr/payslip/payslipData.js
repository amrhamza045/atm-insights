// Builds the itemised snapshot that goes on a payslip (and into its PDF).
const num = (v) => Number(v) || 0;

export function buildPayslipDetail({ rec, calc, extraDeduction = 0 }) {
  const records = calc.validRecords || [];
  const overtime = records
    .filter((a) => num(a.overtime_hours) > 0)
    .map((a) => ({ date: a.attendance_date, hours: num(a.overtime_hours), amount: num(a.overtime_earnings) }));

  const deductions = [];
  records
    .filter((a) => num(a.deduction_amount) > 0 && !a.exception_waived)
    .forEach((a) => deductions.push({
      date: a.attendance_date,
      reason: a.deduction_breakdown || "Late arrival / early leave",
      amount: num(a.deduction_amount),
    }));
  (calc.monthPenalties || []).forEach((p) => deductions.push({
    date: p.incident_date,
    reason: [String(p.penalty_type || "Penalty").replace(/_/g, " "), p.description].filter(Boolean).join(" - "),
    amount: num(p.amount),
  }));
  if (extraDeduction > 0) deductions.push({ date: "", reason: "Manual deduction", amount: extraDeduction });

  const advances = (calc.activeBorrowings || []).map((b) => ({
    date: b.borrow_date,
    reason: b.reason || "Salary advance",
    installment: num(b.amount_per_installment),
    remaining: Math.max(0, num(b.remaining_balance) - num(b.amount_per_installment)),
  }));

  return {
    earnings: {
      base: num(rec.base_salary), hourly: num(rec.hourly_earnings), overtime: num(rec.overtime_earnings),
      bonus: num(rec.bonus), gross: num(rec.gross_salary),
    },
    hours: { total: num(rec.total_hours), overtime: num(rec.overtime_hours), approvedDays: num(rec.approved_days) },
    overtime, deductions, advances,
    totals: { net: num(rec.net_salary) },
  };
}