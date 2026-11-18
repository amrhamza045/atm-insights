import { fmtMoney, fmtNumber, fmtPct, fmtRating } from "@/components/executive/kit/formatters";

// How the Catering Advisor words each check (the server decides which fire):
// its title, why it fired with the figures, what to do, when it fires and its
// source (the finding's (i)), and the detail beside each event it lists.
// words: { currency, vs } — the Finance company currency and the comparison.
export const PRIORITIES = [
  ["high", "High priority", "bg-danger-50 text-danger-700"],
  ["medium", "Medium priority", "bg-warning-50 text-warning-800"],
  ["low", "Low priority", "bg-slate-100 text-slate-600"],
];

const count = (n, one, many = `${one}s`) => `${fmtNumber(n)} ${n === 1 ? one : many}`;
const verb = (n, one, many) => (n === 1 ? one : many);
const signed = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v)}`);
const EVENTS = "Catering › events of the selected branches";
const DELIVERED = "Catering › delivered events of the selected branches";
const WRAPS = "Catering › wrap-ups of the selected branches' delivered events.";
const walkthrough = (e) => `/ExecutiveDashboard?tab=lossanalysis&loss_event_id=${e.id}`;
const margins = (e) => `margin ${fmtPct(e.margin_pct)} vs target ${fmtPct(e.target_pct)}`;

export const CHECKS = {
  overdue_events: {
    area: "Records", title: () => "Close events that are past their date",
    why: (f, w) => `${count(f.count, "event")} dated before today, worth ${fmtMoney(f.amount, w.currency)} in quotes, ${verb(f.count, "was", "were")} never marked delivered or cancelled, so the delivered-event reports and the pipeline ahead leave ${verb(f.count, "it", "them")} out.`,
    action: "Complete each event's wrap-up in Catering, or cancel it.",
    when: "Any event dated before today that is still an enquiry, quoted, awaiting or checking a deposit, confirmed or in progress, whatever the period.",
    source: `${EVENTS}, as of today.`,
    detail: (e, w) => `${e.stage} · ${fmtMoney(e.value, w.currency)}`,
  },
  payments_overdue: {
    area: "Cash", title: () => "Collect overdue payments",
    why: (f, w) => `${count(f.count, "event")} dated today or later ${verb(f.count, "is", "are")} behind ${verb(f.count, "its", "their")} payment schedule: ${fmtMoney(f.amount, w.currency)} was due by now under the payment policy saved on ${verb(f.count, "it", "each")} and is still unpaid.`,
    action: "Follow up with the clients and record the payments in each event's Payments tab.",
    when: "An event awaiting its deposit, confirmed or in progress, dated today or later, that has paid less than its payment policy (Catering › Settings › Payment Policies, as saved on the event) required before today.",
    source: `${EVENTS} and the payment policy saved on each, as of today.`,
    detail: (e, w) => `${fmtMoney(e.value, w.currency)} due since ${e.due_by}`,
  },
  understaffed: {
    area: "Delivery", title: () => "Fill the open staff slots",
    why: (f) => `${count(f.count, "booked event")} ahead ${verb(f.count, "is", "are")} short of ${count(f.extra, "person", "people")} against ${verb(f.count, "its staffing plan", "their staffing plans")}.`,
    action: "Assign the missing staff on each event in Catering before event day.",
    when: "A confirmed or in-progress event dated today or later with fewer staff assigned than its staffing plan requires.",
    source: `${EVENTS} and their staffing plans, as of today.`,
    detail: (e) => `${e.staff_assigned}/${e.staff_required} staff`,
  },
  loss_events: {
    area: "Margin", title: () => "Review the events delivered at a loss",
    why: (f, w) => `${count(f.count, "event")} delivered in the period cost more than ${verb(f.count, "it", "they")} earned, ${fmtMoney(f.amount, w.currency)} short of ${verb(f.count, "its target margin", "their target margins")} in total.`,
    action: "Walk through each event in Loss Analysis to see which costs caused the loss.",
    when: "A delivered event in the period whose actual costs exceed its revenue (Loss Analysis: At a loss).",
    source: `${DELIVERED} and their latest actual-cost calculation.`,
    detail: margins, url: walkthrough,
  },
  below_target: {
    area: "Margin", title: () => "Lift margins on events below target",
    why: (f, w) => `${count(f.count, "event")} delivered in the period made a profit but missed ${verb(f.count, "its target margin", "their target margins")} by ${fmtMoney(f.amount, w.currency)} in total.`,
    action: "Compare the quotes with the actual costs in Loss Analysis, then adjust pricing or portions for similar events.",
    when: "A delivered event in the period with a margin below its target margin but no loss (Loss Analysis: Below target).",
    source: `${DELIVERED} and their latest actual-cost calculation.`,
    detail: margins, url: walkthrough,
  },
  over_estimate: {
    area: "Costs", title: () => "Rein in costs that ran over the estimate",
    why: (f, w) => `${count(f.count, "event")} delivered in the period cost ${fmtMoney(f.amount, w.currency)} more than planned; across every event compared, actual cost was ${signed(f.rate)} against the estimate.`,
    action: "See which cost types overran in Cost Variance, then update the recipes, staffing plans or quotes behind them.",
    when: "A delivered event in the period with complete actual costs whose actual cost is above its plan (the quote's cost estimate plus the staffing plan).",
    source: `${DELIVERED}: quotes, staffing plans, actual-cost calculations and cost exceptions.`,
    detail: (e, w) => `${fmtMoney(e.over, w.currency)} over (${signed(e.over_pct)})`, url: walkthrough,
  },
  incomplete_records: {
    area: "Records", title: () => "Finish the wrap-up of delivered events",
    why: (f) => `${[f.extra.unbilled > 0 && `${count(f.extra.unbilled, "delivered event")} without a final bill`, f.extra.incomplete > 0 && `${count(f.extra.incomplete, "delivered event")} with incomplete actual costs`].filter(Boolean).join(" and ")} in the period, so ${verb(f.count, "its margin is", "their margins are")} missing or understated.`,
    action: "Finalize each bill and complete the actual costs (clock-ins, release slips, equipment check-in) in Catering.",
    when: "A delivered event in the period with no final bill, or whose actual-cost calculation isn't complete.",
    source: `${DELIVERED}, their wrap-ups and actual-cost calculations.`,
  },
  low_ratings: {
    area: "Clients", title: () => "Follow up on low client ratings",
    why: (f) => `${count(f.count, "event")} delivered in the period ${verb(f.count, "was", "were")} rated 1 or 2 out of 5 by the client; the period's average is ${fmtRating(f.rate)}.`,
    action: "Read what those clients said in Client Feedback and call them back.",
    when: "A delivered event in the period that its client rated 1 or 2 at the wrap-up.",
    source: WRAPS,
  },
  conversion_down: {
    area: "Sales", title: () => "Win back booking conversion",
    why: (f, w) => `${fmtPct(f.rate)} of the period's new enquiries are booked, down from ${fmtPct(f.previous)} in the ${w.vs}.`,
    action: "Follow up open quotes sooner and look at the event types converting least in Bookings & Pipeline.",
    when: "The share of the period's new enquiries now booked (confirmed, in progress or delivered) is lower than in the comparison period.",
    source: `${EVENTS}, by the day each was entered.`,
  },
  margin_down: {
    area: "Margin", title: () => "Recover the event margin",
    why: (f, w) => `Delivered events made a ${fmtPct(f.rate)} margin in the period, down from ${fmtPct(f.previous)} in the ${w.vs}.`,
    action: "See which event types, packages and clients slipped in Event P&L.",
    when: "The event margin % of the period's delivered events is lower than in the comparison period.",
    source: `${DELIVERED} at their final bills and recorded actual costs.`,
  },
  cancellations: {
    area: "Sales", title: () => "Reduce cancellations",
    why: (f, w) => `${count(f.count, "event")} worth ${fmtMoney(f.amount, w.currency)} ${verb(f.count, "was", "were")} cancelled in the period, with ${fmtMoney(f.extra, w.currency)} kept in penalties (${fmtNumber(f.previous)} cancelled in the ${w.vs}).`,
    action: "Check the cancellation reasons in Bookings & Pipeline and tighten deposits or follow-up where they repeat.",
    when: "Any event cancelled in the period: medium priority when more were cancelled than in the comparison period, otherwise low.",
    source: `${EVENTS}, by the day each was cancelled.`,
  },
  unrated: {
    area: "Clients", title: () => "Ask clients for a rating",
    why: (f) => `${fmtNumber(f.count)} of the ${count(f.extra, "event")} delivered in the period ${verb(f.count, "has", "have")} no client rating.`,
    action: "Record the client's rating and comment in each event's wrap-up.",
    when: "A delivered event in the period with no 1–5 client rating at its wrap-up.",
    source: WRAPS,
  },
  top_event_type: {
    area: "Growth", title: (f) => `Grow ${f.name} bookings`,
    why: (f, w) => `${f.name} events earned the most margin in the period: ${fmtMoney(f.amount, w.currency)} on ${count(f.count, "event")} (${fmtPct(f.rate)} margin).`,
    action: "Promote this event type and its best packages in your quotes and marketing.",
    when: "Among two or more event types delivered in the period, the one with the highest event margin, when that margin is positive.",
    source: `${DELIVERED} at their final bills and recorded actual costs.`,
  },
  equipment_loss: {
    area: "Equipment", title: () => "Cut equipment damage and loss",
    why: (f, w) => (f.count > 0
      ? `${count(f.count, "piece")} came back damaged or missing from the period's events, costing ${fmtMoney(f.amount, w.currency)} in repairs and replacements.`
      : `Damage recorded on the period's events cost ${fmtMoney(f.amount, w.currency)} in repairs.`),
    action: "Check the damage records in Equipment & Returns and follow up the items that keep coming back damaged or missing.",
    when: "Any piece checked in damaged or missing, or any repair cost recorded, on the period's confirmed, in-progress or delivered events.",
    source: "Catering › equipment bookings, check-ins and damage records of the selected branches.",
  },
  returns_pending: {
    area: "Equipment", title: () => "Decide on the returned food and drink",
    why: (f, w) => `${count(f.count, "item")} logged back after the period's events, worth ${fmtMoney(f.amount, w.currency)}, ${verb(f.count, "is", "are")} still waiting for a decision.`,
    action: "Record in each event's Returned tab whether the items went back to stock, to staff meals or to waste.",
    when: "An item logged back after the period's events whose decision is still pending.",
    source: "Catering › returned items of the selected branches' events.",
  },
};