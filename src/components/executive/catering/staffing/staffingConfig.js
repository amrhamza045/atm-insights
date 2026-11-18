// What Catering Staffing shows on its cards and tables.
const SOURCE = "Catering › confirmed staff assignments on the period's events and each shift's clock-in.";

export const KPIS = ["roles_filled", "staff_shifts", "attendance_rate", "on_time_rate", "labour_cost", "labour_pct_revenue", "labour_vs_plan", "staff_rating"];

export const TYPE_CARD = {
  title: "Who worked the shifts",
  info: { calculation: "The period's staff shifts by employment type, with the pay for the hours clocked on the delivered events.", source: SOURCE },
  tones: { regular: "bg-navy", temporary: "bg-gold", freelance: "bg-success-500" },
  empty: "No staff shifts.",
};

export const ROLE_TABLE = {
  columns: [["staff_shifts", "Shifts", "number", "none"], ["hours_worked", "Hours worked", "number", "none"], ["shift_pay", "Pay", "money", "down"], ["attendance_rate", "Showed up", "percent"], ["staff_rating", "Rating", "rating"]],
  info: {
    calculation: "Each role's confirmed shifts on the period's events; on the delivered events, the hours clocked, the pay for those hours and the share of shifts with a clock-in; and the average 1–5 rating given to the role's staff. Pay comes from the clock-ins, so it can differ slightly from the event labour cost.",
    source: SOURCE,
  },
  empty: "No staff shifts.",
};