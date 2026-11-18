// What Attendance & Hours shows on its cards and tables.
const CLOCK_INS = "HR › Attendance: the clock-in records of the selected branches dated in the period.";

export const KPIS = [["att_due"], ["att_show_rate"], ["att_on_time_rate"], ["att_dependability"], ["att_hours"], ["att_overtime_hours"], ["att_late"], ["att_waiting_review", "As of today"]];
export const SLIP_KPIS = ["att_absences", "att_late_minutes", "att_left_early"];

export const SHIFTS_CARD = {
  title: "Event and regular shifts",
  info: { calculation: "Shifts attended in the period, with their hours: catering event shifts (planned from event staffing) and regular shifts.", source: `${CLOCK_INS} HR › Shifts.` },
  tones: { event: "bg-gold", regular: "bg-navy" },
  format: "hours",
  empty: "No shifts were attended in the period.",
};

export const DEPARTMENT_INFO = {
  calculation: "Each department's shifts due, the share attended, on time and dependable, absences, hours and overtime. People are in their current department. For anyone who can't open HR records, a department of fewer than three people is put under Other. Most shifts first.",
  source: `${CLOCK_INS} HR › Employees.`,
};

export const PERSON_INFO = {
  calculation: "Each person's shifts due, the share attended, on time and dependable, late arrivals with their average minutes late, early leaving, absences, hours and overtime, with the rules of the Dependability score on their profile. Least dependable first.",
  source: CLOCK_INS,
};