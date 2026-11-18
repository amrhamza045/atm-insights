// Payment policies on catering events, with database access: which policy an
// event gets, re-applying it after a reschedule, and the gate that stops an
// event moving forward while it breaks its policy.
import { getCompanyOffset, companyDay, TIMEZONE_MISSING } from './companyTimezone.js';
import { loadEventMoney } from './cateringPaymentPosting.js';
import { pickPolicy, snapshotPolicy, daysBetween, policyState } from './paymentPolicyRules.js';

export const hasPolicy = (event) => !!event?.payment_policy_id;

// policy: true marks the refusals this module raises, so callers can tell them from failures.
const refuse = (message, code = 'payment_policy') => Object.assign(new Error(message), { code, status: 409, policy: true });

/** Today in the company's timezone (Admin › Settings › Timezone). */
export async function companyToday(svc) {
  const offset = await getCompanyOffset(svc.entities);
  if (offset === null) throw refuse(TIMEZONE_MISSING);
  return companyDay(offset);
}

const DECIDED = ['pending', 'approved', 'rejected'];

/**
 * The policy fields for an event dated eventDate, booked today. Re-applying the
 * same policy keeps its approval decision; any other policy starts it over.
 */
export async function policyFields(svc, eventDate, today, previous = null) {
  const daysAhead = daysBetween(today, eventDate);
  if (!(daysAhead >= 0)) throw refuse('The event date is in the past.', 'no_payment_policy');
  const policy = pickPolicy(await svc.entities.CateringPaymentPolicy.list('min_days_before', 200), daysAhead);
  if (!policy) {
    throw refuse(`No active payment policy covers events booked ${daysAhead} day(s) ahead. An admin must add one in Catering › Settings › Payment Policies before this event can go ahead.`, 'no_payment_policy');
  }
  const snap = snapshotPolicy(policy);
  const kept = previous?.payment_policy_id === policy.id ? previous.policy_approval_status : null;
  const approval = !snap.requires_approval ? 'not_required' : DECIDED.includes(kept) ? kept : 'pending';
  return {
    payment_policy_id: policy.id,
    payment_policy_name: snap.name,
    payment_policy: snap,
    payment_policy_booked_on: today,
    payment_policy_event_date: eventDate,
    payment_policy_days_ahead: daysAhead,
    ...(approval === kept ? {} : {
      policy_approval_status: approval,
      policy_approval_decided_by: '',
      policy_approval_decided_at: '',
      policy_approval_note: '',
    }),
  };
}

/** Re-applies the policy after a reschedule (the event date no longer matches the date it was applied for). */
export async function ensureEventPolicy(svc, event, today) {
  if (!hasPolicy(event) || event.payment_policy_event_date === event.event_date) return event;
  const fields = await policyFields(svc, event.event_date, today, event);
  await svc.entities.CateringEvent.update(event.id, fields);
  return { ...event, ...fields };
}

/** Live money plus the policy's schedule, required deposit and blocking issues. */
export async function loadPolicyState(svc, event, today) {
  const money = await loadEventMoney(svc, event);
  const state = policyState(event, { quoteTotal: Number(event.quote_total) || 0, grandTotal: money.grandTotal, totalPaid: money.totalPaid }, today);
  return { money, today, ...state };
}

/**
 * Gate for anything that moves an event forward (Confirm & Start, stock release).
 * Re-applies the policy after a reschedule. blocked = why the event can't go ahead, else null.
 */
export async function policyGate(svc, event) {
  if (!hasPolicy(event)) return { event, state: null, blocked: null };
  try {
    const today = await companyToday(svc);
    const current = await ensureEventPolicy(svc, event, today);
    const state = await loadPolicyState(svc, current, today);
    return { event: current, state, blocked: state.issues.length ? state.issues.map((i) => i.message).join(' ') : null };
  } catch (e) {
    if (!e.policy) throw e;
    return { event, state: null, blocked: e.message };
  }
}