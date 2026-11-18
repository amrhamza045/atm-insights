// What Labor Cost shows on its cards and tables.
const PAYROLL = "HR › Payroll: the payroll records of the selected branches for the months paid.";

export const KPIS = [["labor_payroll_cost"], ["labor_net_paid"], ["labor_revenue_share"], ["labor_event_share"], ["labor_overtime_cost"], ["labor_cost_per_hour"], ["labor_people_paid"], ["labor_advances_owed", "As of today"]];

export const MAKEUP_INFO = {
  calculation: "How the months' pay adds up: base salaries, hourly and overtime pay, less late and early deductions, give gross pay; bonuses make it the payroll cost; penalties, advances recovered and other deductions come off that to give the net paid.",
  source: PAYROLL,
};

export const groupInfo = (by) => ({
  calculation: `Payroll of the months paid by ${by}: people paid, payroll cost, its share of the total, cost per person per month and overtime pay. A ${by} of fewer than three people is put under Other (with the next smallest until Other has three), so no one's pay can be read off. Highest cost first.`,
  source: by === "department" ? `${PAYROLL} Each person is in their current department in HR › Employees.` : PAYROLL,
});

export const LEDGER_CARD = {
  title: "Payroll vs the ledger",
  label: "Payroll cost",
  ledgerLabel: "Posted to staff costs",
  info: {
    calculation: "The payroll cost of the months paid beside what was posted to the staff-cost accounts mapped in Finance › Mapping Accounts (permanent kitchen payroll and administrative salaries) for the same months, debits minus credits.",
    source: "HR › Payroll of the picked company's branches, and Finance › the posted company ledger.",
  },
  gapNote: "Payroll doesn't post to the ledger by itself yet, so its monthly entries are made by hand in Finance › Journals. A difference means a month's entry is missing or doesn't match the payroll.",
};