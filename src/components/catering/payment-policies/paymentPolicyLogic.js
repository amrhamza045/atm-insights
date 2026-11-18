import { formatCurrency } from "@/components/utils/currencyFormatter";

// Catering › Settings › Payment Policies. Every rule lives in the
// CateringPaymentPolicy records the owner sets up; this file only describes,
// previews and checks them. "Days ahead" = days from the day the event is
// requested to the event date.

export const AMOUNT_TYPES = [
  { value: "percent", label: "% of the quote" },
  { value: "fixed", label: "EGP (fixed amount)" },
  { value: "balance", label: "Remaining balance" },
];

export const DUE_TYPES = [
  { value: "booking_day", label: "On the booking day" },
  { value: "days_after_booking", label: "days after booking" },
  { value: "days_before_event", label: "days before the event" },
];

export const AMOUNT_MODES = [
  { value: "running_total", label: "Running total", hint: "Each step is the total the client must have paid by then." },
  { value: "separate", label: "Separate payments", hint: "Each step is a new payment on top of the earlier ones." },
];

const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const text = (v) => (v === null || v === undefined ? "" : String(v));
const days = (n) => `${n} day${n === 1 ? "" : "s"}`;
const wholeDays = (n) => n !== null && Number.isInteger(n) && n >= 0;
const uid = () => Math.random().toString(36).slice(2);

export function describeRange(min, max) {
  const from = num(min) ?? 0;
  const to = num(max);
  if (to === null) return from === 0 ? "Any booking, however far ahead" : `Booked ${days(from)} or more before the event`;
  if (from === 0) return `Booked less than ${days(to)} before the event`;
  return `Booked at least ${days(from)} and less than ${days(to)} before the event`;
}

export function describeDue(step) {
  const d = num(step.due_days) ?? 0;
  if (step.due_type === "days_before_event") return d > 0 ? `No later than ${days(d)} before the event` : "By the event day";
  if (step.due_type === "days_after_booking" && d > 0) return `Within ${days(d)} of booking`;
  return "On the booking day";
}

export function describeAmount(step, mode) {
  if (step.amount_type === "balance") return "Pay the remaining balance";
  const a = num(step.amount) ?? 0;
  const value = step.amount_type === "fixed" ? formatCurrency(a) : `${a}% of the quote`;
  return mode === "separate" ? `Pay ${value}` : `Total paid reaches ${value}`;
}

/** What each step asks for on a sample quote total, in order (never more than the quote). */
export function scheduleBreakdown(policy, quote) {
  let paid = 0;
  const steps = (policy.schedule || []).map((step) => {
    const a = num(step.amount) ?? 0;
    const value = step.amount_type === "percent" ? (quote * a) / 100 : a;
    const target = step.amount_type === "balance" ? quote : policy.amount_mode === "separate" ? paid + value : value;
    const due = Math.max(0, Math.min(target, quote) - paid);
    paid += due;
    return { due, paidSoFar: paid, capped: target - quote > 0.005 };
  });
  return { steps, unpaid: Math.max(0, quote - paid) };
}

/** Problems in one policy that don't depend on the quote amount. */
export function policyWarnings(policy) {
  const steps = policy.schedule || [];
  const from = num(policy.min_days_before) ?? 0;
  const out = [];
  steps.forEach((s, i) => {
    const d = num(s.due_days) ?? 0;
    if (s.due_type === "days_before_event" && d > from) {
      out.push(`Payment ${i + 1} is due ${days(d)} before the event, which is before the booking day for bookings made less than ${days(d)} ahead.`);
    }
    if (s.due_type === "days_after_booking" && d > from) {
      out.push(`Payment ${i + 1} is due ${days(d)} after booking, which is after the event for bookings made less than ${days(d)} ahead.`);
    }
  });
  const percents = steps.filter((s) => s.amount_type === "percent").map((s) => num(s.amount) ?? 0);
  const percentTotal = policy.amount_mode === "separate" ? percents.reduce((a, b) => a + b, 0) : Math.max(0, ...percents);
  if (steps.length && !steps.some((s) => s.amount_type === "balance") && percentTotal < 100) {
    out.push("The steps may not add up to the whole quote. End with a \"Remaining balance\" step so the rest has a due date.");
  }
  if (policy.amount_mode === "separate" && percentTotal > 100) {
    out.push(`The percentages add up to ${percentTotal}%, more than the whole quote.`);
  }
  return out;
}

const span = (from, to) => (to === Infinity ? `${days(from)} or more` : from === 0 ? `less than ${days(to)}` : `${from} to less than ${days(to)}`);

/** Days-ahead ranges no active policy covers, and ranges two active policies both cover. */
export function coverageIssues(policies) {
  const active = policies
    .filter((p) => p.is_active !== false)
    .map((p) => ({ name: p.name, from: num(p.min_days_before) ?? 0, to: num(p.max_days_before) ?? Infinity }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const issues = [];
  let reach = 0;
  let widest = null;
  active.forEach((p) => {
    if (p.from > reach) issues.push(`No active policy covers bookings made ${span(reach, p.from)} ahead.`);
    else if (widest && p.from < reach) issues.push(`"${widest.name}" and "${p.name}" both cover bookings made ${span(p.from, Math.min(reach, p.to))} ahead.`);
    if (p.to > reach) {
      reach = p.to;
      widest = p;
    }
  });
  if (active.length && reach !== Infinity) issues.push(`No active policy covers bookings made ${span(reach, Infinity)} ahead.`);
  return { activeCount: active.length, issues };
}

export const emptyStep = () => ({ uid: uid(), label: "", amount_type: "percent", amount: "", due_type: "booking_day", due_days: "" });

/** Editor state for a saved policy (or a new one): numbers kept as typed text. */
export function toForm(policy) {
  const p = policy || {};
  const steps = p.id ? p.schedule || [] : [{}];
  return {
    name: text(p.name),
    description: text(p.description),
    is_active: p.is_active !== false,
    min_days_before: text(p.min_days_before),
    max_days_before: text(p.max_days_before),
    amount_mode: p.amount_mode || "running_total",
    schedule: steps.map((s) => ({
      ...emptyStep(),
      label: text(s.label),
      amount_type: s.amount_type || "percent",
      amount: s.amount_type === "balance" ? "" : text(s.amount),
      due_type: s.due_type || "booking_day",
      due_days: s.due_type && s.due_type !== "booking_day" ? text(s.due_days) : "",
    })),
    requires_approval: p.requires_approval === true,
    approver_role_key: text(p.approver_role_key),
    approval_status_label: text(p.approval_status_label),
    hold_until_approved: p.requires_approval ? p.hold_until_approved !== false : true,
  };
}

export function toRecord(form) {
  const approval = form.requires_approval;
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    is_active: form.is_active,
    min_days_before: Number(form.min_days_before),
    max_days_before: form.max_days_before === "" ? null : Number(form.max_days_before),
    amount_mode: form.amount_mode,
    schedule: form.schedule.map((s) => ({
      label: s.label.trim(),
      amount_type: s.amount_type,
      amount: s.amount_type === "balance" ? 0 : Number(s.amount),
      due_type: s.due_type,
      due_days: s.due_type === "booking_day" ? 0 : Number(s.due_days),
    })),
    requires_approval: approval,
    approver_role_key: approval ? form.approver_role_key : "",
    approval_status_label: approval ? form.approval_status_label.trim() : "",
    hold_until_approved: approval && form.hold_until_approved,
  };
}

/** Blocking problems; step errors are keyed "step:<uid>". */
export function validatePolicy(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Give the policy a name.";
  const from = num(form.min_days_before);
  const to = num(form.max_days_before);
  if (!wholeDays(from)) errors.range = "Enter the first number of days as a whole number (0 or more).";
  else if (form.max_days_before !== "" && (!wholeDays(to) || to <= from)) errors.range = "The upper limit must be a whole number of days above the first number.";
  if (!form.schedule.length) errors.schedule = "Add at least one payment step.";
  form.schedule.forEach((s) => {
    const amount = num(s.amount);
    let problem = null;
    if (s.amount_type === "percent" && (amount === null || amount <= 0 || amount > 100)) problem = "Enter a percentage above 0 and up to 100.";
    else if (s.amount_type === "fixed" && (amount === null || amount <= 0)) problem = "Enter an amount above 0.";
    else if (s.due_type !== "booking_day" && !wholeDays(num(s.due_days))) problem = "Enter the days as a whole number (0 or more).";
    if (problem) errors[`step:${s.uid}`] = problem;
  });
  if (form.requires_approval && !form.approver_role_key) errors.approval = "Choose who approves these bookings.";
  return errors;
}