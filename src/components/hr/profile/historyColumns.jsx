import { Badge } from "@/components/ui/badge";

const money = (v) => (v || v === 0 ? `EGP ${Number(v).toFixed(2)}` : null);
const time = (v) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null);
const tag = (v) => (v ? <Badge variant="outline" className="text-[10px]">{String(v).replace(/_/g, " ")}</Badge> : null);

export const attendanceColumns = [
  { label: "Date", render: (r) => r.attendance_date },
  { label: "Shift", render: (r) => r.assigned_shift_label || (r.assigned_shift_start ? `${r.assigned_shift_start}–${r.assigned_shift_end}` : null) },
  { label: "In", render: (r) => time(r.sign_in_time) },
  { label: "Out", render: (r) => time(r.sign_out_time) },
  { label: "Hours", render: (r) => r.hours_worked?.toFixed?.(2) },
  { label: "Late (min)", render: (r) => r.late_minutes || null },
  { label: "Deduction", render: (r) => money(r.deduction_amount || null) },
  { label: "Status", render: (r) => tag(r.status) },
  { label: "Review", render: (r) => tag(r.review_status) },
];

export const penaltyColumns = [
  { label: "Date", render: (r) => r.incident_date },
  { label: "Type", render: (r) => tag(r.penalty_type) },
  { label: "Amount", render: (r) => money(r.amount) },
  { label: "Applies to", render: (r) => r.apply_to_month?.slice(0, 7) },
  { label: "Status", render: (r) => tag(r.status) },
  { label: "Details", render: (r) => r.description },
];

export const payrollColumns = [
  { label: "Month", render: (r) => r.month?.slice(0, 7) },
  { label: "Base", render: (r) => money(r.base_salary) },
  { label: "Hourly", render: (r) => money(r.hourly_earnings) },
  { label: "Overtime", render: (r) => money(r.overtime_earnings) },
  { label: "Bonus", render: (r) => money(r.bonus) },
  { label: "Deductions", render: (r) => money((r.deductions || 0) + (r.attendance_deductions || 0)) },
  { label: "Penalties", render: (r) => money(r.penalty_deductions) },
  { label: "Borrowings", render: (r) => money(r.borrowing_deductions) },
  { label: "Gross", render: (r) => money(r.gross_salary) },
  { label: "Net", render: (r) => money(r.net_salary) },
  { label: "Payment", render: (r) => tag(r.payment_status) },
];

export const shiftColumns = [
  { label: "Date", render: (r) => r.shift_date || (r.is_repeating ? `Repeats ${(r.repeat_days || []).map((d) => d.slice(0, 3)).join(", ")}` : null) },
  { label: "Time", render: (r) => `${r.start_time}–${r.end_time}` },
  { label: "Hours", render: (r) => r.expected_hours },
  { label: "Type", render: (r) => tag(r.shift_source) },
  { label: "Event / role", render: (r) => [r.catering_event_name, r.catering_role].filter(Boolean).join(" · ") || null },
  { label: "Status", render: (r) => tag(r.status) },
];

export const borrowingColumns = [
  { label: "Date", render: (r) => r.borrow_date },
  { label: "Amount", render: (r) => money(r.amount) },
  { label: "Repayment", render: (r) => (r.repayment_type === "lump_sum" ? "Lump sum" : `${r.installment_months} × ${money(r.amount_per_installment) || "—"}`) },
  { label: "Repaid", render: (r) => money(r.total_repaid) },
  { label: "Remaining", render: (r) => money(r.remaining_balance) },
  { label: "Status", render: (r) => tag(r.status) },
  { label: "Reason", render: (r) => r.reason },
];