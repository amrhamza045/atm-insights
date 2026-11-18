// What Workforce shows on its cards and tables.
const ROSTER = "HR › Employees and Ex-Employees of the selected branches, system accounts left out.";

export const KPIS = [["wf_headcount", "As of today"], ["wf_on_leave", "As of today"], ["wf_hires"], ["wf_leavers"], ["wf_turnover"], ["wf_appraisals"], ["wf_rating"], ["wf_discipline"]];

export const TREND_INFO = { calculation: "People employed at the end of each day or month: hired by then (or with no hire date) and not yet left.", source: ROSTER };

export const TYPES_CARD = {
  title: "Staff by type",
  info: { calculation: "Everyone employed today by employment type.", source: `${ROSTER} As of today.` },
  tones: { regular: "bg-navy", temporary: "bg-gold", freelance: "bg-success-500" },
  empty: "No one is employed today.",
};

export const tableInfo = (by) => ({
  calculation: `Headcount and people on leave today, with the period's hires and leavers, by ${by}. Most people first.`,
  source: by === "branch" ? `${ROSTER} Each person's current branch; removed people the branch they left from.` : `${ROSTER} Each person's current department.`,
});

export const APPRAISAL_INFO = {
  calculation: "Appraisals approved or rejected in the period, the approved ratings from 5 down to 1, and each appraisal for people who can open HR records. Appraisals still waiting for a decision are counted as of today.",
  source: "HR › Appraisals of the selected branches, by the day each was decided.",
};

export const DISCIPLINE_CARD = {
  title: "Disciplinary actions",
  info: { calculation: "Warnings and hearing minutes recorded in the period, by type.", source: "HR › Discipline of the selected branches, by action date." },
  tones: { verbal_warning: "bg-gold", warning_1: "bg-warning-500", warning_2: "bg-danger-500", hearing_minutes: "bg-navy" },
  empty: "No disciplinary actions were recorded in the period.",
};