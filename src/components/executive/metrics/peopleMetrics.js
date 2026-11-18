// The People figures of the Executive Dashboard (part of METRICS): label,
// calculation, source, format and which way is better.
const PAYROLL = "HR › Payroll: the payroll records of the selected branches, a whole month at a time — every month whose first day falls in the period.";
const LEDGER = "Finance › the posted company ledger for the selected company or branch.";
const CLOCK_INS = "HR › Attendance: the clock-in records of the selected branches dated in the period. Manual clock-ins HR hasn't confirmed (or refused) don't count.";
const ROSTER = "HR › Employees and Ex-Employees of the selected branches, system accounts left out.";
const POINTS = "Changes are shown in percentage points.";
const TODAY = "A snapshot as of today, so it doesn't follow the period.";
const NO_BUDGET = "Finance budgets are set per P&L section with no staff-cost line, so payroll has no budget to compare with.";

const money = (label, goodWhen, calculation, source = PAYROLL, note) => ({ label, format: "money", goodWhen, calculation, source, note });
const share = (label, goodWhen, calculation, source) => ({ label, format: "percent", goodWhen, calculation, source, note: POINTS });
const count = (label, goodWhen, calculation, source, note) => ({ label, format: "number", goodWhen, calculation, source, note });
const hours = (label, goodWhen, calculation) => ({ label, format: "hours", goodWhen, calculation, source: CLOCK_INS });

export const PEOPLE_METRICS = {
  labor_payroll_cost: money("Payroll cost", "none", "What staff earned in the months paid: gross pay (base salary, hourly and overtime pay, less late and early deductions) plus bonuses.", PAYROLL, NO_BUDGET),
  labor_net_paid: money("Net paid", "none", "Payroll cost less penalties, advances recovered and other deductions: what staff took home."),
  labor_revenue_share: share("Payroll % of revenue", "down", "Payroll cost ÷ the net revenue posted to the ledger for the same months × 100.", `${PAYROLL} ${LEDGER}`),
  labor_event_share: share("Charged to events", "up", "Labour cost of the catering events delivered in the same months (from staff clock-ins, as in Event P&L) ÷ payroll cost × 100. The rest is staff cost no event carried.", `${PAYROLL} Catering › delivered events of the selected branches.`),
  labor_overtime_cost: money("Overtime pay", "down", "Overtime pay on the payroll records of the months paid."),
  labor_cost_per_hour: money("Cost per hour worked", "down", "Payroll cost ÷ the approved clock-in hours on the same payroll records."),
  labor_people_paid: count("People paid", "none", "Different people with a payroll record in the months paid.", PAYROLL),
  labor_advances_owed: money("Advances owed", "down", "What is left to recover on approved staff advances. Shown only when three people or more owe, so no one's advance can be read off.", "HR › Borrowings of the selected branches, as of today.", TODAY),

  att_due: count("Shifts due", "none", "Clock-in records in the period: shifts attended plus absences (absent or no-show).", CLOCK_INS),
  att_show_rate: share("Showed up", "up", "Shifts attended ÷ shifts due × 100.", CLOCK_INS),
  att_on_time_rate: share("On time", "up", "Shifts attended with no late minutes ÷ shifts attended × 100.", CLOCK_INS),
  att_dependability: share("Dependability", "up", "Shifts attended on time and for the whole shift ÷ shifts due × 100: the rule of the Dependability score on each employee's profile.", CLOCK_INS),
  att_hours: hours("Hours worked", "none", "Hours recorded on the shifts attended."),
  att_overtime_hours: hours("Overtime", "down", "Overtime hours recorded on the shifts attended."),
  att_absences: count("Absences", "down", "Shifts marked absent or no-show.", CLOCK_INS),
  att_late: count("Late arrivals", "down", "Shifts attended with late minutes.", CLOCK_INS),
  att_late_minutes: count("Minutes late", "down", "Average late minutes on the late arrivals.", CLOCK_INS),
  att_left_early: count("Left early", "down", "Shifts attended that ended early.", CLOCK_INS),
  att_waiting_review: count("Waiting for HR", "down", "Clock-ins whose payroll review is still pending and manual clock-ins HR hasn't confirmed, whatever their date.", "HR › Attendance of the selected branches, as of today.", TODAY),

  wf_headcount: count("Headcount", "none", "Everyone employed today: hired (or with no hire date) and not left, on leave included.", ROSTER, TODAY),
  wf_on_leave: count("On leave", "none", "People employed today whose status is On leave.", ROSTER, TODAY),
  wf_hires: count("Hires", "none", "People whose hire date falls in the period.", ROSTER),
  wf_leavers: count("Leavers", "down", "People who left in the period: the day HR removed their access, or the day they were removed from HR.", ROSTER),
  wf_turnover: share("Turnover", "down", "Leavers ÷ the average headcount (the day before the period and its last day) × 100.", ROSTER),
  wf_appraisals: count("Appraisals decided", "none", "Appraisals approved or rejected in the period, by the day each was decided.", "HR › Appraisals of the selected branches."),
  wf_rating: { label: "Average rating", format: "rating", goodWhen: "up", calculation: "Average 1–5 rating of the appraisals approved in the period. Shown for three approved appraisals or more to anyone who can't open HR records.", source: "HR › Appraisals of the selected branches.", note: "Changes are shown in points." },
  wf_discipline: count("Disciplinary actions", "down", "Warnings and hearing minutes recorded in the period, by action date.", "HR › Discipline of the selected branches."),
};