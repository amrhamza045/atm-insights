// What each Executive Dashboard figure means: its label, how it is calculated,
// where the numbers come from, how it is shown and which way is better. The
// (i) tips, KPI cards and the green / red colouring all read from here, so a
// figure is explained the same way wherever it appears.
// format: money | number | percent | rating | hours · goodWhen: up | down | none.
import { SUPPLY_METRICS } from "./supplyMetrics";
import { KITCHEN_METRICS } from "./kitchenMetrics";
import { PEOPLE_METRICS } from "./peopleMetrics";
import { CUSTOMER_METRICS } from "./customerMetrics";

const LEDGER = "Finance › the posted company ledger for the selected company or branch. Only posted journals count; drafts and entries waiting for review don't.";
const EVENTS = "Catering › events of the selected branches.";
const PAYMENTS = "Catering › payments with status Completed, by payment date, for the selected branches.";
const BILLS = "Catering › delivered events of the selected branches: final bills and the latest actual-cost calculation.";
const AHEAD = "A snapshot as of today, so it doesn't follow the period.";
const ENTERED = "Catering › events of the selected branches, by the day each was entered.";
const CANCELLED = "Catering › cancelled events of the selected branches, by the day each was cancelled.";
const LOSS = "Catering › delivered events of the selected branches (status Completed, by event date): the latest actual-cost calculation of each.";
const STAFF = "Catering › confirmed staff assignments on the period's events, each shift's clock-in and the staff ratings.";
const RECENT = "Recent enquiries may still book, so the latest periods can read lower.";
const CASH = "Finance › the posted company ledger: the cash and bank accounts (Cash on Hand, Petty Cash, Bank Accounts, or any account marked as a cash equivalent in Finance › Accounts). Only posted journals count.";
const PLAN = "Catering › delivered events of the selected branches with complete actual costs (status Completed, by event date): their quotes, staffing plans, latest actual-cost calculations and cost exceptions.";
const KIT = "Catering › equipment booked for the confirmed, in-progress and delivered events of the selected branches dated in the period (released bookings don't count) and their damage records.";
const RETURNED = "Catering › food and drink logged back after the confirmed, in-progress and delivered events of the selected branches dated in the period.";
const WRAP_UP = "Catering › delivered events of the selected branches (status Completed, by event date) and the client rating given at each event's wrap-up.";
const NOT_BUDGETED = "Budgets don't cover cash or balances, so these have no budget comparison.";

const money = (label, goodWhen, calculation, source = LEDGER, note) => ({ label, format: "money", goodWhen, calculation, source, note });
const count = (label, calculation, source, note) => ({ label, format: "number", goodWhen: "up", calculation, source, note });
const margin = (label, calculation) => ({ label, format: "percent", goodWhen: "up", calculation, source: LEDGER, note: "Changes are shown in percentage points." });

export const METRICS = {
  revenue: money("Net revenue", "up", "Revenue accounts for the period, credits minus debits: sales after discounts and returns."),
  cost_of_sales: money("Cost of sales", "down", "Cost-of-sales accounts for the period, debits minus credits: food, beverage and other direct costs."),
  gross_profit: money("Gross profit", "up", "Net revenue minus cost of sales."),
  gross_margin: margin("Gross margin", "Gross profit ÷ net revenue × 100."),
  operating_expenses: money("Operating expenses", "down", "Operating-expense accounts for the period, debits minus credits: salaries, rent, utilities, marketing and other running costs."),
  operating_profit: money("Operating profit", "up", "Gross profit minus operating expenses."),
  other_result: money("Other income & expenses", "up", "Other income and finance income minus other expenses and finance costs (accounts starting with 7), credits minus debits. A negative amount is a net expense."),
  income_tax: money("Income tax", "down", "Income-tax accounts for the period (accounts starting with 8), debits minus credits."),
  net_profit: money("Net profit", "up", "Gross profit minus operating expenses, other income and expenses, finance items and income tax."),
  net_margin: margin("Net margin", "Net profit ÷ net revenue × 100."),
  closing_cash: money("Cash at period end", "up", "Balance of the cash and bank accounts on the last day of the period, opening balances included.", CASH, NOT_BUDGETED),
  opening_cash: money("Cash at period start", "up", "Balance of the cash and bank accounts before the first day of the period.", CASH, NOT_BUDGETED),
  cash_received: money("Cash received", "up", "Money paid into the cash and bank accounts in the period. Moves between the company's own cash and bank accounts and opening balances aren't counted. A receipt voided in the period is taken off cash received instead of counting as money paid out.", CASH, NOT_BUDGETED),
  cash_paid: money("Cash paid out", "down", "Money paid out of the cash and bank accounts in the period. Moves between the company's own cash and bank accounts aren't counted. A payment voided in the period is taken off cash paid out instead of counting as money received.", CASH, NOT_BUDGETED),
  opening_added: money("Opening balances entered", "none", "Cash and bank opening balances entered in the period with opening-balance journals.", CASH, NOT_BUDGETED),
  net_cash_change: money("Net change in cash", "up", "Cash at period end minus cash at period start: cash received, minus cash paid out, plus opening balances entered.", CASH, NOT_BUDGETED),
  owed_suppliers: money("Owed to suppliers", "down", "Balance of the supplier payables accounts at the end of the period's last day, credits minus debits.", "Finance › the posted company ledger: the account set for supplier payables in Finance › Mapping Accounts, or the Suppliers account of Automatic posting.", NOT_BUDGETED),

  events_held: count("Events held", "Events marked Completed with an event date in the period.", EVENTS),
  held_value: money("Value of events held", "up", "Quote totals of the events held in the period.", EVENTS),
  avg_event_value: money("Average event value", "up", "Value of events held ÷ events held.", EVENTS),
  collected: money("Catering cash collected", "up", "Deposits, final and additional payments and penalties received in the period, minus refunds, credit notes and deposit withdrawals.", PAYMENTS),
  booked_events: count("Confirmed events ahead", "Confirmed or in-progress events dated today or later.", EVENTS, AHEAD),
  booked_value: money("Confirmed revenue ahead", "up", "Quote totals of the confirmed events ahead.", EVENTS, AHEAD),
  balance_due: money("Balance still to collect", "none", "Unpaid balance on the confirmed events ahead.", EVENTS, AHEAD),
  held_unpaid: money("Unpaid on completed events", "down", "Unpaid balance of the events marked Completed, whatever their date.", EVENTS, AHEAD),
  deposits_held: money("Deposits held for events ahead", "none", "Payments already received for the confirmed or in-progress events dated today or later.", EVENTS, AHEAD),
  open_events: count("Open enquiries & quotes", "Events still in enquiry, quoted or awaiting a deposit, dated today or later.", EVENTS, AHEAD),
  open_value: money("Pipeline value", "up", "Quote totals of the open enquiries and quotes.", EVENTS, AHEAD),

  new_leads: count("New leads", "Leads created in the period from every source: contact form, social media, WhatsApp and referrals.", "CRM › leads, all branches."),
  new_clients: count("New clients", "Clients served for the first time in the period: their first delivered event, at any branch, falls in it.", "Catering › events (Completed, by event date), picked branches."),

  events_delivered: count("Events delivered", "Events marked Completed with an event date in the period.", BILLS),
  guests_served: count("Guests served", "Actual guests on each delivered event's final bill (the guaranteed or expected count when none was recorded).", BILLS),
  event_revenue: money("Event revenue", "up", "Final bills of the delivered events, as confirmed on each event's reconciliation.", BILLS),
  event_costs: money("Direct event costs", "down", "Recorded actual costs: food and ingredients, labour from staff clock-ins, equipment damage and loss, and post-event cost exceptions.", BILLS),
  event_margin: money("Event margin", "up", "Event revenue minus direct event costs.", BILLS),
  event_margin_pct: { label: "Event margin %", format: "percent", goodWhen: "up", calculation: "Event margin ÷ event revenue × 100.", source: BILLS, note: "Changes are shown in percentage points." },

  new_enquiries: count("New enquiries", "Events entered in the period, whatever their event date and whatever became of them.", ENTERED),
  won_events: count("Booked", "The period's new enquiries that are now confirmed, in progress or delivered.", ENTERED, RECENT),
  booking_conversion: { label: "Booking conversion", format: "percent", goodWhen: "up", calculation: "Booked ÷ new enquiries × 100.", source: ENTERED, note: `Changes are shown in percentage points. ${RECENT}` },
  won_value: money("Value booked", "up", "Quote totals of the period's new enquiries that are now booked.", ENTERED, RECENT),
  cancellations: { label: "Cancellations", format: "number", goodWhen: "down", calculation: "Events cancelled in the period, whenever they were entered.", source: CANCELLED },
  cancelled_value: money("Value cancelled", "down", "Quote totals of the events cancelled in the period. The penalties kept are listed under Cancellations.", CANCELLED),
  below_target_events: { label: "Below target", format: "number", goodWhen: "down", calculation: "Delivered events whose margin fell below their target margin (losses included).", source: LOSS },
  loss_events: { label: "At a loss", format: "number", goodWhen: "down", calculation: "Delivered events whose costs were more than their revenue.", source: LOSS },
  below_target_rate: { label: "Below-target rate", format: "percent", goodWhen: "down", calculation: "Events below target ÷ delivered events with complete actual costs × 100.", source: LOSS, note: "Changes are shown in percentage points." },
  margin_shortfall: money("Short of target", "down", "On the events below target: target margin % × revenue, less the actual margin, added up.", LOSS),
  margin_vs_quote: money("Margin vs quote", "up", "Actual margin less the margin expected when each event was quoted, across the events with complete actual costs.", LOSS),
  insufficient_events: { label: "Can't be analysed", format: "number", goodWhen: "down", calculation: "Delivered events whose actual costs are still incomplete (for example missing release slips or staff clock-ins).", source: LOSS },

  roles_filled: { label: "Roles filled", format: "percent", goodWhen: "up", calculation: "Staff assigned ÷ staff required on the period's confirmed, in-progress and delivered events × 100. Extra staff on one event don't make up for gaps on another.", source: STAFF, note: "Changes are shown in percentage points." },
  staff_shifts: count("Staff shifts", "Confirmed staff assignments on the period's events.", STAFF),
  attendance_rate: { label: "Showed up", format: "percent", goodWhen: "up", calculation: "Shifts on delivered events with a clock-in ÷ all shifts on delivered events × 100.", source: STAFF, note: "Changes are shown in percentage points." },
  on_time_rate: { label: "On time", format: "percent", goodWhen: "up", calculation: "Shifts clocked in on time ÷ shifts with a clock-in × 100.", source: STAFF, note: "Changes are shown in percentage points." },
  labour_cost: money("Labour cost", "down", "Actual labour cost of the delivered events, from the staff clock-ins, as in Event P&L.", BILLS),
  labour_pct_revenue: { label: "Labour % of revenue", format: "percent", goodWhen: "down", calculation: "Labour cost ÷ event revenue × 100, on the delivered events with a final bill.", source: BILLS, note: "Changes are shown in percentage points." },
  labour_vs_plan: money("Labour vs plan", "down", "Actual labour cost less the labour planned when each event was confirmed. Below zero is under plan.", BILLS),
  staff_rating: { label: "Staff rating", format: "rating", goodWhen: "up", calculation: "Average of the 1–5 ratings managers gave staff on the period's events. Custody shortages still waiting for review don't count.", source: STAFF, note: "Changes are shown in points." },
  staffing_coverage: { label: "Staffing coverage", format: "percent", goodWhen: "up", calculation: "Staff assigned ÷ staff required on the confirmed events ahead × 100. Extra staff on one event don't make up for gaps on another.", source: EVENTS, note: AHEAD },

  planned_cost: money("Planned cost", "none", "The quote's cost estimate plus the staffing plan of each event with complete actual costs.", PLAN),
  actual_cost: money("Actual cost", "down", "The latest actual-cost calculation of each of those events plus its active cost exceptions, as in Event P&L.", PLAN),
  cost_vs_estimate: money("Cost vs estimate", "down", "Actual cost less planned cost. Above zero is an overspend, below zero is under plan.", PLAN),
  cost_vs_estimate_pct: { label: "Cost vs estimate %", format: "percent", goodWhen: "down", calculation: "Cost vs estimate ÷ planned cost × 100.", source: PLAN, note: "Changes are shown in percentage points." },
  over_estimate_events: { label: "Over estimate", format: "number", goodWhen: "down", calculation: "Events whose actual cost was more than their planned cost.", source: PLAN },

  equipment_events: count("Events with equipment", "Events of the period with at least one equipment booking.", KIT),
  pieces_booked: count("Pieces booked", "Pieces of equipment booked for the period's events.", KIT),
  usage_cost: money("Usage cost", "down", "Pieces booked × the usage cost per event (the booking's own rate where it was changed, else the catalog's).", KIT),
  damaged_missing: { label: "Damaged or missing", format: "number", goodWhen: "down", calculation: "Pieces checked in damaged, plus pieces that didn't come back.", source: KIT },
  damage_loss_cost: money("Damage & loss cost", "down", "Repair cost of the damage records plus missing pieces × their replacement price (saved at check-in, else the catalog's), as each event's actual equipment cost counts them.", KIT),
  returned_value: money("Returned value", "none", "Recorded value of the food and drink logged back after the period's events: quantity × the unit cost entered for each item.", RETURNED),
  back_to_stock_value: money("Back to stock", "up", "Recorded value of the returned items put back in stock.", RETURNED),
  wasted_value: money("Wasted returns", "down", "Recorded value of the returned items thrown away.", RETURNED),

  client_rating: { label: "Client rating", format: "rating", goodWhen: "up", calculation: "Average of the 1–5 ratings clients gave their delivered events at the wrap-up.", source: WRAP_UP, note: "Changes are shown in points." },
  rated_events: count("Events rated", "Delivered events whose client gave a rating.", WRAP_UP),
  rating_coverage: { label: "Response rate", format: "percent", goodWhen: "up", calculation: "Events rated ÷ delivered events × 100.", source: WRAP_UP, note: "Changes are shown in percentage points." },
  happy_share: { label: "Rated 4 or 5", format: "percent", goodWhen: "up", calculation: "Events rated 4 or 5 ÷ events rated × 100.", source: WRAP_UP, note: "Changes are shown in percentage points." },
  low_ratings: { label: "Rated 1 or 2", format: "number", goodWhen: "down", calculation: "Delivered events their client rated 1 or 2.", source: WRAP_UP },

  ...SUPPLY_METRICS,
  ...KITCHEN_METRICS,
  ...PEOPLE_METRICS,
  ...CUSTOMER_METRICS,
};