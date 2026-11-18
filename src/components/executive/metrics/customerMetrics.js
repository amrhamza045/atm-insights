// The Customers & growth figures of the Executive Dashboard (part of METRICS):
// label, calculation, source, format and which way is better.
const LEADS = "CRM › Leads from every source, the whole business (leads aren't kept per branch), by the day each was entered.";
const BOOKED = `${LEADS} Their clients' catering events (Confirmed, In progress or Completed).`;
const SERVED = "Catering › delivered events of the selected branches (status Completed, by event date) at their final bills, and CRM › Clients (merged clients count once, as the client kept).";
const WIN_BACK = "Catering › every event not cancelled, at any branch: clients whose latest event was delivered by the selected branches. Clients set Inactive in CRM are left out.";
const CARE = "CRM › the calls, WhatsApp messages, meetings, emails, notes and complaints logged on client records, the whole business, by the day each happened.";
const FOLLOW_UPS = "CRM › the follow-ups set on client contacts, the whole business, by the day each was due.";
const TODAY = "A snapshot as of today, so it doesn't follow the period.";
const POINTS = "Changes are shown in percentage points.";
const RECENT = "Recent leads may still book, so the latest periods can read lower.";

const count = (label, goodWhen, calculation, source, note) => ({ label, format: "number", goodWhen, calculation, source, note });
const share = (label, goodWhen, calculation, source, note = POINTS) => ({ label, format: "percent", goodWhen, calculation, source, note });
const money = (label, goodWhen, calculation, source, note) => ({ label, format: "money", goodWhen, calculation, source, note });

export const CUSTOMER_METRICS = {
  lead_new: count("New leads", "up", "Leads entered in the period: WhatsApp, Instagram, Facebook, LinkedIn and TikTok, the website contact form, guest referrals and leads added by hand.", LEADS),
  lead_converted: count("Converted to clients", "up", "Leads of the period that staff have converted into a client.", LEADS),
  lead_conversion: share("Conversion rate", "up", "Leads converted to clients ÷ new leads × 100.", LEADS),
  lead_booked: count("Leads that booked", "up", "Leads of the period whose client went on to book. A booking (Confirmed, In progress or Completed) entered after a lead, for an event on or after the lead's day, is credited to the client's latest lead before it; each lead counts once.", BOOKED, RECENT),
  lead_booking_rate: share("Booking rate", "up", "Leads that booked ÷ new leads × 100.", BOOKED, `${POINTS} ${RECENT}`),
  lead_booked_value: money("Value booked", "up", "Quote totals of the bookings credited to the period's leads.", BOOKED, RECENT),
  lead_lost: count("Lost leads", "down", "Leads of the period closed as lost without becoming a client.", LEADS),
  lead_waiting: count("Waiting for first contact", "down", "Leads still New (not contacted and not converted), whatever day they came in.", "CRM › Leads, the whole business.", TODAY),

  cl_served: count("Clients served", "up", "Different clients with a delivered event in the period.", SERVED),
  cl_first_time: count("First-time clients", "up", "Clients served whose first delivered event, at any branch, falls in the period.", SERVED),
  cl_returning_share: share("Returning share", "up", "Clients served who had a delivered event before the period ÷ clients served × 100.", SERVED),
  cl_revenue_per_client: money("Revenue per client", "up", "Final bills of the clients' delivered events ÷ the clients billed. Events with no client linked are left out.", SERVED),
  cl_returning_revenue_share: share("Revenue from returning clients", "up", "Final bills of the returning clients' events ÷ the final bills of every delivered event in the period × 100.", SERVED),
  cl_top10_share: share("Top 10 clients' share", "none", "Final bills of the ten clients billed the most ÷ the final bills of every delivered event in the period × 100. A high share means revenue rests on a few clients.", SERVED),
  cl_due: count("Due to rebook", "none", "Clients whose latest event was delivered in the 60 days from this day last year, with nothing booked or enquired since: last year's occasion is coming round again.", WIN_BACK, TODAY),
  cl_quiet: count("Gone quiet", "down", "Clients whose latest event was delivered over a year ago, with nothing booked or enquired since.", WIN_BACK, TODAY),

  care_contacts: count("Contacts logged", "up", "Calls, WhatsApp messages, meetings and emails logged on client records in the period.", CARE),
  care_clients_contacted: count("Clients contacted", "up", "Different clients with a contact logged in the period.", CARE),
  care_complaints: count("Complaints", "down", "Complaints logged on client records in the period.", CARE),
  care_complaint_rate: share("Complaint rate", "down", "Complaints logged ÷ the events delivered in the period × 100: complaints per 100 delivered events.", `${CARE} Catering › delivered events (status Completed, by event date), every branch.`),
  care_follow_ups_due: count("Follow-ups due", "none", "Follow-ups whose due day falls in the period.", FOLLOW_UPS),
  care_on_time_rate: share("Follow-ups on time", "up", "Follow-ups due in the period marked done on or before their due day ÷ follow-ups due × 100.", FOLLOW_UPS),
  care_overdue: count("Overdue follow-ups", "down", "Follow-ups past their due day and not done, whatever day they were due.", "CRM › follow-ups on client contacts, the whole business.", TODAY),
  care_quiet: count("Accounts gone quiet", "down", "Corporate clients (not Inactive) with an event on record (cancelled ones aside) and no call, WhatsApp, meeting or email logged in the last 90 days.", "CRM › Clients and their logged contacts, and Catering › events, the whole business.", TODAY),
};