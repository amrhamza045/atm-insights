// What Client Care shows on its cards and tables.
const CARE = "CRM › the contacts, notes and complaints logged on client records, the whole business, by the day each happened.";

export const KPIS = [["care_contacts"], ["care_clients_contacted"], ["care_complaints"], ["care_complaint_rate"], ["care_follow_ups_due"], ["care_on_time_rate"], ["care_overdue", "As of today"], ["care_quiet", "As of today"]];

export const TREND_INFO = { calculation: "Calls, WhatsApp messages, meetings and emails logged each day or month, beside the comparison period's at the matching day or month.", source: CARE };

export const TYPES_CARD = {
  title: "What was logged",
  info: { calculation: "Everything logged on client records in the period, by type.", source: CARE },
  tones: { call: "bg-navy", whatsapp: "bg-success-500", meeting: "bg-gold", email: "bg-slate-400", note: "bg-slate-200", other: "bg-slate-300", complaint: "bg-danger-500" },
  empty: "Nothing was logged with clients in this period.",
};

export const TEAM_INFO = {
  calculation: "Each person who looks after clients or logged contacts: the clients they own today (by their HR record), the contacts and complaints they logged in the period, the follow-ups they owe that are overdue today, and the final bills of their clients' events delivered in the period. Most contacts first.",
  source: `${CARE} CRM › Clients (owner) and Catering › delivered events, every branch.`,
};

export const QUIET_INFO = {
  calculation: "Corporate clients (not Inactive) with an event on record and no call, WhatsApp, meeting or email logged in the last 90 days. Longest without contact first.",
  source: "CRM › Clients and their logged contacts, and Catering › events not cancelled, the whole business, as of today.",
};

export const COMPLAINTS_INFO = { calculation: "The complaints logged in the period, latest first (the 25 most recent).", source: CARE };