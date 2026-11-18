import HistorySection from "./HistorySection";
import { useEmployeeHistory, cutoff30, isoDate } from "./useEmployeeHistory";
import { attendanceColumns, penaltyColumns, payrollColumns, shiftColumns, borrowingColumns } from "./historyColumns";

/** mode "month": last 30 days. mode "all": hire date → today. */
export default function EmployeeHistoryTab({ employee, mode = "all" }) {
  const h = useEmployeeHistory(employee.id);
  const today = isoDate(new Date());
  const month = mode === "month";
  const from = month ? cutoff30() : (employee.hire_date || "").slice(0, 10) || undefined;
  // Payroll months are dated the 1st, so compare on the month start.
  const payrollFrom = month ? cutoff30() : from ? `${from.slice(0, 7)}-01` : undefined;
  const rangeLabel = month ? "in the last 30 days" : "since hire date";
  const common = { from, to: today, rangeLabel };

  return (
    <div className="space-y-4">
      {!month && (
        <p className="text-sm text-slate-500">
          All records from {employee.hire_date || "the first record"} until today ({today}).
        </p>
      )}
      <HistorySection title="Attendance" query={h.attendance} dateKey="attendance_date" columns={attendanceColumns} {...common} />
      <HistorySection title="Penalties" query={h.penalties} dateKey="incident_date" columns={penaltyColumns} {...common} />
      <HistorySection title="Payroll" query={h.payroll} dateKey="month" columns={payrollColumns} {...common} from={payrollFrom} />
      <HistorySection title="Shifts worked" query={h.shifts} dateKey="shift_date" columns={shiftColumns} {...common} />
      <HistorySection title="Borrowings" query={h.borrowings} dateKey="borrow_date" columns={borrowingColumns} {...common} />
    </div>
  );
}