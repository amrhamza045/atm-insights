// What Leads & Sources shows on its cards and tables.
const LEADS = "CRM › Leads from every source, the whole business, by the day each was entered.";
const REFERRALS = "CRM › Leads created by the referral form of event passes, the whole business, by the day each was entered.";

export const KPIS = [["lead_new"], ["lead_converted"], ["lead_conversion"], ["lead_booked"], ["lead_booking_rate"], ["lead_booked_value"], ["lead_lost"], ["lead_waiting", "As of today"]];

export const TREND_INFO = { calculation: "Leads entered each day or month of the period, beside the comparison period's at the matching day or month.", source: LEADS };

export const STAGES_CARD = {
  title: "Where the leads stand",
  info: { calculation: "The period's leads by where each stands today: new, contacted, qualified, converted into a client or lost.", source: LEADS },
  tones: { new: "bg-slate-300", contacted: "bg-gold", qualified: "bg-navy", converted: "bg-success-500", lost: "bg-danger-400" },
  empty: "No leads were entered in this period.",
};

// [figure, heading, format] per table column.
export const COLUMNS = [["lead_new", "Leads", "number"], ["lead_converted", "Converted", "number"], ["lead_conversion", "Conversion", "percent"], ["lead_booked", "Booked", "number"], ["lead_booked_value", "Value booked", "money"]];
export const SHORT_COLUMNS = COLUMNS.slice(0, 4);

const BY = {
  source: "the channel each came in from (guest referrals and the website contact form by the form that created them)",
  campaign: "the campaign named on each",
  area: "the governorate given on each",
};
export const groupInfo = (by) => ({
  calculation: `The period's leads by ${BY[by]}: leads, those converted to clients, the conversion rate and those that booked${by === "source" ? ", with the value booked" : ""}. Most leads first.`,
  source: LEADS,
});

export const REFERRALS_INFO = {
  calculation: "Leads that guests sent through their event pass, what became of them, and the referral commissions: earned on events dated in the period, paid in the period, and still owed today. Commissions are shown to people with financial viewing permission.",
  source: `${REFERRALS} The referral commissions in CRM › Referrals.`,
};

export const REFERRERS_INFO = { calculation: "Each guest who referred leads in the period, with the event they referred from, what became of their leads and the commission earned on events dated in the period. Most leads first.", source: REFERRALS };
export const EVENTS_INFO = { calculation: "The events whose guests referred leads in the period, with what became of those leads. Most leads first.", source: REFERRALS };