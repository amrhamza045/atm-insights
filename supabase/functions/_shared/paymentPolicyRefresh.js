// An event's payment policy as the Payments tab shows it, and the resync after
// anything changes the event's money or date.
import { round2 } from './cateringPaymentPosting.js';
import { companyToday, ensureEventPolicy, loadPolicyState, policyFields } from './paymentPolicyEvent.js';

function view(event, { money, schedule, deposit, issues }, today, extra = []) {
  return {
    policy: event.payment_policy,
    policy_name: event.payment_policy_name,
    booked_on: event.payment_policy_booked_on,
    days_ahead: event.payment_policy_days_ahead,
    approval: {
      status: event.policy_approval_status,
      decided_by: event.policy_approval_decided_by || '',
      decided_at: event.policy_approval_decided_at || '',
      note: event.policy_approval_note || '',
    },
    today,
    total_paid: money.totalPaid,
    whole: schedule.whole,
    deposit,
    steps: schedule.steps.map(({ label, amount_type, due_date, required_by_then }) => ({ label, amount_type, due_date, required_by_then })),
    issues: [...extra, ...issues],
  };
}

/** Read-only. A reschedule not re-applied yet is shown with the policy the new date gets. */
export async function policyView({ svc }, event) {
  const today = await companyToday(svc);
  let current = event;
  const extra = [];
  if (event.payment_policy_event_date !== event.event_date) {
    try {
      current = { ...event, ...(await policyFields(svc, event.event_date, today, event)) };
    } catch (e) {
      if (!e.policy) throw e;
      extra.push({ code: e.code, message: e.message });
    }
  }
  return view(current, await loadPolicyState(svc, current, today), today, extra);
}

/** Re-applies the policy after a reschedule, then rebuilds the deposit and totals from the live payments. */
export async function refreshEvent({ svc }, event) {
  const today = await companyToday(svc);
  const current = await ensureEventPolicy(svc, event, today);
  const state = await loadPolicyState(svc, current, today);
  if (current.status === 'cancelled') return view(current, state, today);
  const { money, deposit } = state;
  const depositStatus = money.depositPaid <= 0 ? 'none' : deposit > 0 && money.depositPaid >= deposit ? 'paid' : 'partial';
  const demote = ['confirmed', 'in_progress'].includes(current.status) && depositStatus !== 'paid';
  const patch = {
    required_deposit_amount: deposit,
    total_paid: money.totalPaid,
    deposit_paid_amount: money.depositPaid,
    balance_due: round2(money.grandTotal - money.totalPaid),
    deposit_status: depositStatus,
    ...(demote ? { status: 'deposit_pending' } : {}),
  };
  await svc.entities.CateringEvent.update(current.id, patch);
  return view({ ...current, ...patch }, state, today);
}