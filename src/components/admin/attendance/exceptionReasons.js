export const EXCEPTION_REASONS = [
  "Approved by manager",
  "Transport / traffic issue",
  "Medical or emergency",
  "System / clock-in error",
  "Working off-site / on assignment",
  "Approved leave",
  "Other (manager discretion)",
];

// An incident is a late arrival, early leave, or no-show carrying a penalty.
export const incidentType = (r) => {
  if (r.status === "no_show") return "No-show";
  if ((r.late_minutes || 0) > 0) return "Late arrival";
  if ((r.early_leave_minutes || 0) > 0) return "Early leave";
  return "Penalty";
};