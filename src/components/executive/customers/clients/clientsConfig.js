// What Clients & Retention shows on its cards and tables.
const SERVED = "Catering › delivered events of the selected branches (status Completed, by event date) at their final bills, and CRM › Clients.";
const WIN_BACK = "Catering › every event not cancelled, at any branch: clients whose latest event was delivered by the selected branches. Clients set Inactive in CRM are left out.";

export const KPIS = [["cl_served"], ["cl_first_time"], ["cl_returning_share"], ["cl_revenue_per_client"], ["cl_returning_revenue_share"], ["cl_top10_share"], ["cl_due", "As of today"], ["cl_quiet", "As of today"]];

export const SERVED_INFO = {
  calculation: "Different clients with a delivered event each day or month: first-time (their first delivered event at any branch) and returning, with the comparison period's clients served at the matching day or month.",
  source: SERVED,
};

// [figure, heading, format] per table column.
export const TYPE_COLUMNS = [["clients", "Clients", "number"], ["revenue", "Revenue", "money"]];
export const TYPE_INFO = { calculation: "The period's delivered events by client type: clients served and the final bills of their events. Events with no client linked are listed apart.", source: SERVED };

export const TOP_INFO = {
  calculation: "The clients served in the period, billed the most first: their delivered events, when they were first served (at any branch) and their final bills with the share of all the period's final bills. Amounts are shown to people who can see client financials.",
  source: SERVED,
};

export const DUE_INFO = { calculation: "Clients whose latest event was delivered in the 60 days from this day last year, with nothing booked or enquired since: a good moment to get in touch about this year's occasion. Earliest first.", source: `${WIN_BACK} As of today.` };
export const QUIET_INFO = { calculation: "Clients whose latest event was delivered over a year ago, with nothing booked or enquired since. Most recent first.", source: `${WIN_BACK} As of today.` };