// Bookings a payment policy sends for approval: the approver's queue and the decision.
import { audit } from './auditLog.js';
import { companyToday, loadPolicyState } from './paymentPolicyEvent.js';

const refuse = (message, status = 400) => Object.assign(new Error(message), { status });
// The policy names the approving role; its members also need Booking Approvals (catering_booking_approve).
const isApprover = ({ central, permissions }, event) =>
  central || (permissions.catering_booking_approve === true && !!permissions.role
    && permissions.role === event.payment_policy?.approver_role_key);
const inBranch = ({ central, permissions }, event) =>
  central || !permissions.branch_id || permissions.branch_id === event.branch_id;

/** Bookings waiting for the caller: Booking Approvals plus the role the event's policy names (central admins see all). */
export async function pendingBookings(ctx) {
  const rows = await ctx.svc.entities.CateringEvent.filter({ policy_approval_status: 'pending' }, 'event_date', 200);
  const events = rows.filter((e) => e.status !== 'cancelled' && isApprover(ctx, e) && inBranch(ctx, e));
  return {
    events: events.map((e) => ({
      id: e.id, event_name: e.event_name, client_name: e.client_name, event_date: e.event_date,
      branch_name: e.branch_name, expected_guests: e.expected_guests, quote_total: e.quote_total,
      status: e.status, payment_policy_name: e.payment_policy_name, payment_policy_days_ahead: e.payment_policy_days_ahead,
      hold: e.payment_policy?.hold_until_approved === true,
    })),
  };
}

/** Approve or reject a booking. Approving one whose first payment is already in confirms the event. */
export async function decideBooking(ctx, event, { decision, note }) {
  const { svc, user } = ctx;
  if (!['approve', 'reject'].includes(decision)) throw refuse('Choose approve or reject.');
  if (!isApprover(ctx, event)) throw refuse("Only staff with Booking Approvals on the approver role set in this booking's payment policy can decide it.", 403);
  if (event.policy_approval_status !== 'pending') throw refuse('This booking is not waiting for approval.', 409);
  if (event.status === 'cancelled') throw refuse('This event is cancelled.', 409);
  const reason = String(note || '').trim();
  if (decision === 'reject' && !reason) throw refuse('Give the reason the booking is not approved.');

  const now = new Date().toISOString();
  const patch = {
    policy_approval_status: decision === 'approve' ? 'approved' : 'rejected',
    policy_approval_decided_by: user.email,
    policy_approval_decided_at: now,
    policy_approval_note: reason,
  };
  if (decision === 'approve' && !['confirmed', 'in_progress', 'completed'].includes(event.status)) {
    const { money, deposit } = await loadPolicyState(svc, { ...event, ...patch }, await companyToday(svc));
    if (deposit > 0 && money.depositPaid >= deposit) {
      Object.assign(patch, { status: 'confirmed', deposit_status: 'paid', required_deposit_amount: deposit });
      if (!event.inventory_reserved && !['reserved', 'shortfall', 'pending_approval'].includes(event.reservation_status || 'none')) {
        Object.assign(patch, { reservation_status: 'pending_approval', reservation_requested_by: user.email, reservation_requested_date: now, reservation_rejection_reason: '' });
      }
    }
  }
  await svc.entities.CateringEvent.update(event.id, patch);
  await audit(ctx.base44, user, decision === 'approve' ? 'approve' : 'reject', 'CateringEvent',
    `${decision === 'approve' ? 'Approved' : 'Did not approve'} the booking of ${event.event_name} under the "${event.payment_policy_name}" payment policy${reason ? `: ${reason}` : ''}`,
    { entityId: event.id, entityName: event.event_name, changes: { policy_approval_status: { from: 'pending', to: patch.policy_approval_status } } });
  return { ok: true, approval: patch.policy_approval_status, status: patch.status || event.status };
}