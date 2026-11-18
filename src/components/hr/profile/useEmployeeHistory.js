import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const LIMIT = 500;

export function isoDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function cutoff30() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return isoDate(d);
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** The shift the employee is on today (one-off first, then a repeating pattern). */
export function currentShiftOf(shifts) {
  const today = isoDate(new Date());
  const dow = DAYS[new Date().getDay()];
  const active = (s) => s.status !== "cancelled";
  const oneOff = shifts.find((s) => active(s) && s.shift_date === today);
  if (oneOff) return oneOff;
  return shifts.find((s) =>
    active(s) && s.is_repeating && (s.repeat_days || []).includes(dow) &&
    (!s.repeat_start_date || s.repeat_start_date <= today) &&
    (!s.repeat_end_date || s.repeat_end_date >= today)
  ) || null;
}

/** Every HR record that belongs to one employee, newest first. */
export function useEmployeeHistory(employeeId) {
  const load = (entity, sort) => ({
    queryKey: ["employeeHistory", entity, employeeId],
    queryFn: () => base44.entities[entity].filter({ employee_id: employeeId }, sort, LIMIT),
    enabled: !!employeeId,
  });
  return {
    attendance: useQuery(load("Attendance", "-attendance_date")),
    penalties: useQuery(load("SalaryPenalty", "-incident_date")),
    payroll: useQuery(load("SalaryRecord", "-month")),
    shifts: useQuery(load("Shift", "-shift_date")),
    borrowings: useQuery(load("EmployeeBorrowing", "-borrow_date")),
  };
}