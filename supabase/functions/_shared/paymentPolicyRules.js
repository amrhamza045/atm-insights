// Payment policies (Catering › Settings › Payment Policies) as applied to
// catering events. Pure rules, no database access. Dates are company-local
// "YYYY-MM-DD" strings.

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const DAY_MS = 86400000;
const dayMs = (d) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d, n) => new Date(dayMs(d) + n * DAY_MS).toISOString().slice(0, 10);
export const daysBetween = (from, to) => Math.round((dayMs(to) - dayMs(from)) / DAY_MS);
const egp = (n) => `${round2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
const noLimit = (v) => v === null || v === undefined || v === '';

/** The active policy whose booking window holds daysAhead. Overlapping windows: the one starting latest wins. */
export function pickPolicy(policies, daysAhead) {
  return policies
    .filter((p) => p.is_active !== false
      && daysAhead >= (Number(p.min_days_before) || 0)
      && (noLimit(p.max_days_before) || daysAhead < Number(p.max_days_before)))
    .sort((a, b) => (Number(b.min_days_before) || 0) - (Number(a.min_days_before) || 0))[0] || null;
}

/** What a booked event keeps of its policy, so later edits to the policy don't change it. */
export function snapshotPolicy(p) {
  const approval = p.requires_approval === true;
  return {
    id: p.id,
    name: p.name || '',
    min_days_before: Number(p.min_days_before) || 0,
    max_days_before: noLimit(p.max_days_before) ? null : Number(p.max_days_before),
    amount_mode: p.amount_mode === 'separate' ? 'separate' : 'running_total',
    schedule: (p.schedule || []).map((s) => ({
      label: s.label || '',
      amount_type: s.amount_type,
      amount: Number(s.amount) || 0,
      due_type: s.due_type,
      due_days: Number(s.due_days) || 0,
    })),
    requires_approval: approval,
    approver_role_key: approval ? p.approver_role_key || '' : '',
    approval_status_label: approval ? p.approval_status_label || '' : '',
    hold_until_approved: approval && p.hold_until_approved === true,
  };
}

/**
 * Each payment step with its due date (kept between the booking day and the
 * event day) and the total that must be paid by then. Percentages are of the
 * quote total; "Remaining balance" is everything the client owes.
 */
export function policySchedule(policy, { bookedOn, eventDate, quoteTotal, grandTotal }) {
  const quote = round2(quoteTotal);
  const whole = round2(Math.max(Number(grandTotal) || 0, quote));
  const steps = (policy?.schedule || []).map((s) => {
    const days = Number(s.due_days) || 0;
    const raw = s.due_type === 'days_before_event' ? addDays(eventDate, -days)
      : s.due_type === 'days_after_booking' ? addDays(bookedOn, days) : bookedOn;
    const due = raw < bookedOn ? bookedOn : raw > eventDate ? eventDate : raw;
    const value = s.amount_type === 'balance' ? whole
      : s.amount_type === 'percent' ? round2((quote * (Number(s.amount) || 0)) / 100) : round2(s.amount);
    return { label: s.label || '', amount_type: s.amount_type, due_date: due, value };
  });
  const separate = policy?.amount_mode === 'separate';
  const requiredBy = (date) => {
    const due = steps.filter((s) => s.due_date <= date);
    if (due.some((s) => s.amount_type === 'balance')) return whole;
    const total = separate ? due.reduce((n, s) => n + s.value, 0) : Math.max(0, ...due.map((s) => s.value));
    return round2(Math.min(whole, total));
  };
  return { whole, requiredBy, steps: steps.map((s) => ({ ...s, required_by_then: requiredBy(s.due_date) })) };
}

/** The first payment: the total due by the earliest due date. It is the event's required deposit. */
export function firstPayment(schedule) {
  const first = schedule.steps.map((s) => s.due_date).sort()[0];
  return first ? schedule.requiredBy(first) : 0;
}

/** A booking on approval hold, or one that wasn't approved, may not be confirmed or move forward. */
export const approvalHolds = (event) => event?.policy_approval_status === 'rejected'
  || (event?.policy_approval_status === 'pending' && event?.payment_policy?.hold_until_approved === true);

const scheduleOf = (event, quoteTotal, grandTotal) => policySchedule(event.payment_policy, {
  bookedOn: event.payment_policy_booked_on, eventDate: event.event_date, quoteTotal, grandTotal,
});

/** The event's required deposit under its policy. */
export const eventFirstPayment = (event, quoteTotal, grandTotal) => firstPayment(scheduleOf(event, quoteTotal, grandTotal));

/** Why the event can't move forward under its policy today (empty = it can). */
export function policyIssues(event, schedule, totalPaid, today) {
  const name = event.payment_policy_name || event.payment_policy?.name || '';
  const issues = [];
  if (event.policy_approval_status === 'rejected') {
    issues.push({ code: 'approval_rejected', message: `This booking was not approved under the "${name}" payment policy.` });
  } else if (approvalHolds(event)) {
    issues.push({ code: 'approval_pending', message: `This booking is on hold until it is approved (${event.payment_policy?.approval_status_label || 'awaiting approval'}).` });
  }
  const lastDue = schedule.steps.map((s) => s.due_date).filter((d) => d < today).sort().pop();
  const owed = lastDue ? schedule.requiredBy(lastDue) : 0;
  if (lastDue && totalPaid + 0.005 < owed) {
    issues.push({ code: 'payment_overdue', message: `A payment is overdue: ${egp(owed)} had to be paid by ${lastDue} under the "${name}" payment policy, and ${egp(totalPaid)} is paid.` });
  }
  return issues;
}

/** Schedule, required deposit and blocking issues for an event under its policy. */
export function policyState(event, { quoteTotal, grandTotal, totalPaid }, today) {
  const schedule = scheduleOf(event, quoteTotal, grandTotal);
  return { schedule, deposit: firstPayment(schedule), issues: policyIssues(event, schedule, totalPaid, today) };
}