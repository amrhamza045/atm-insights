import { statusWords } from "@/components/catering/eventLabels";

// Where an upcoming event stands, read from the roll-ups kept on the event.
// Each stage is { tone, label, detail }; `tab` is the Catering tab it opens.

export const STAGE_TONES = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  progress: "border-blue-200 bg-blue-50 text-blue-700",
  waiting: "border-amber-200 bg-amber-50 text-amber-800",
  alert: "border-red-200 bg-red-50 text-red-700",
  idle: "border-slate-200 bg-slate-50 text-slate-500",
};

const egp = (n) => `${Math.round(n).toLocaleString("en-US")} EGP`;
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

const BOOKING = {
  enquiry: ["idle", "Enquiry"],
  quoted: ["progress", "Quoted"],
  deposit_pending: ["waiting", "Awaiting deposit"],
  deposit_pending_verification: ["waiting", "Transfer to verify"],
  confirmed: ["done", "Confirmed"],
  in_progress: ["done", "Operations started"],
};

function bookingStage(e) {
  const [tone, label] = BOOKING[e.status] || ["idle", statusWords(e.status)];
  if (e.policy_approval_status === "rejected") return { tone: "alert", label: "Booking not approved", detail: label };
  if (e.policy_approval_status === "pending") {
    return { tone: "waiting", label, detail: e.payment_policy?.approval_status_label || "Awaiting approval" };
  }
  return { tone, label };
}

function paymentStage(e) {
  const quote = Number(e.quote_total) || 0;
  const paid = Number(e.total_paid) || 0;
  const deposit = Number(e.required_deposit_amount) || 0;
  if (quote <= 0) return { tone: "idle", label: "No quote yet", detail: paid > 0 ? `${egp(paid)} paid` : null };
  if (paid + 0.005 >= quote) return { tone: "done", label: "Fully paid", detail: egp(paid) };
  if (e.status === "deposit_pending_verification") return { tone: "waiting", label: "Transfer to verify", detail: `${egp(paid)} of ${egp(quote)}` };
  if (deposit > 0 && paid + 0.005 >= deposit) return { tone: "progress", label: "Deposit paid", detail: `${egp(quote - paid)} balance left` };
  if (deposit > 0 && paid > 0) return { tone: "waiting", label: "Deposit partly paid", detail: `${egp(paid)} of ${egp(deposit)}` };
  if (deposit > 0) return { tone: "waiting", label: "Deposit due", detail: egp(deposit) };
  return paid > 0
    ? { tone: "progress", label: "Partly paid", detail: `${egp(quote - paid)} balance left` }
    : { tone: "waiting", label: "Unpaid", detail: `${egp(quote)} due` };
}

const PROCUREMENT = { po_raised: "PO raised", partially_delivered: "Partly delivered", covered: "Purchases delivered" };

function stockStage(e) {
  const short = Number(e.reservation_shortfall_count) || Number(e.open_shortfall_count) || 0;
  if (e.reservation_status === "pending_approval") return { tone: "waiting", label: "Awaiting approval", detail: "Stock reservation" };
  if (e.reservation_status === "reserved") return { tone: "done", label: "Reserved" };
  if (e.reservation_status === "released") return { tone: "done", label: "Released" };
  if (e.reservation_status === "shortfall") {
    return { tone: e.procurement_status === "covered" ? "progress" : "alert", label: plural(short, "shortfall"), detail: PROCUREMENT[e.procurement_status] || "No PO yet" };
  }
  return { tone: "idle", label: "Not reserved" };
}

function productionStage(e) {
  const batches = Number(e.production_batch_count) || 0;
  const detail = batches ? plural(batches, "batch", "batches") : null;
  if (e.production_plan_status === "released") return { tone: "done", label: "Released to kitchen", detail };
  if (e.production_plan_status === "planned") return { tone: "progress", label: "Planned", detail };
  return { tone: "idle", label: "Not planned" };
}

function staffingStage(e) {
  const assigned = Number(e.staffing_assigned_count) || 0;
  const required = Number(e.staffing_required_count) || 0;
  const critical = Number(e.staffing_unfilled_critical_count) || 0;
  const detail = required ? `${assigned} of ${required} assigned` : null;
  if (critical > 0) return { tone: "alert", label: `${plural(critical, "critical role")} open`, detail };
  if (e.staffing_status === "fully_staffed") return { tone: "done", label: "Fully staffed", detail };
  if (e.staffing_status === "partially_staffed") return { tone: "waiting", label: "Partly staffed", detail };
  if (e.staffing_status === "planned") return { tone: "waiting", label: "Planned", detail };
  return { tone: "idle", label: "Not planned" };
}

export const STAGES = [
  { key: "booking", label: "Booking", tab: "events", of: bookingStage },
  { key: "payment", label: "Payment", tab: "payments", of: paymentStage },
  { key: "stock", label: "Stock", tab: "planning", of: stockStage },
  { key: "production", label: "Production", tab: "planning", of: productionStage },
  { key: "staffing", label: "Staffing", tab: "staffing", of: staffingStage },
];

/** Days from today to the event (negative once past), in words. Both are YYYY-MM-DD company dates. */
export function whenLabel(date, today) {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days === -1 ? "Yesterday" : days > 0 ? `In ${days} days` : `${-days} days ago`;
  return { days, label };
}