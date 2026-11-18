import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeFinanceOnEvent } from '../../shared/cateringPaymentPosting.js';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../../shared/platformRole.js';
import { submitCateringPayment } from '../../shared/cateringPaymentSubmit.js';
import { reviewCateringPayment } from '../../shared/cateringPaymentReview.js';
import { canSelfApprove } from '../../shared/autoApproval.js';
import { withCateringPaymentReviewLock } from '../../shared/cateringPaymentReviewLock.js';
import { cancellationPlan, SETTLEMENT_PREFIX } from '../../shared/cateringCancellationPlan.js';
import { audit } from '../../shared/auditLog.js';
import { runInventoryJob } from '../../shared/inventoryAccountingJob.js';

// Catering event cancellation: read the settlement plan, settle it (fee kept
// from the deposit, shortfall collected or surplus refunded, all as normal
// approved payments), then cancel the event once nothing is left to settle.
const fail = (message, status) => Response.json({ error: message }, { status });

async function cateringAccess(base44, eventId) {
  const user = await base44.auth.me();
  if (!user) return { error: 'Unauthorized', status: 401 };
  const permissions = await getEffectivePermissions(base44, user);
  const central = isCentralAdmin(user, permissions);
  const allowed = central || (permissions && !permissions.access_denied && (permissions.catering_edit === true || permissions.catering_finance === true));
  if (!allowed) return { error: 'Forbidden: requires catering edit or finance access', status: 403 };
  const event = await base44.asServiceRole.entities.CateringEvent.get(eventId).catch(() => null);
  if (!event) return { error: 'Event not found', status: 404 };
  if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id) return { error: 'Forbidden: this event belongs to another branch', status: 403 };
  return { user, event };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const svc = base44.asServiceRole;
    if (typeof body.event_id !== 'string' || !body.event_id) return fail('Select an event.', 400);

    if (body.action === 'plan') {
      const auth = await cateringAccess(base44, body.event_id);
      if (auth.error) return fail(auth.error, auth.status);
      return Response.json({ plan: await cancellationPlan(svc, auth.event) });
    }

    if (body.action === 'settle') {
      const auth = await authorizeFinanceOnEvent(base44, body.event_id);
      if (auth.error) return fail(auth.error, auth.status);
      if (!body.payment_method) return fail('Choose a payment method.', 400);
      const selfApprove = await canSelfApprove(svc, auth.central, auth.permissions, 'catering_payment_approve', auth.user);
      const submitted = [];
      // Up to three steps in one go (collect → keep fee → refund) when the submitter may self-approve.
      for (let i = 0; i < 3; i++) {
        const payment = await withCateringPaymentReviewLock(svc, auth.event.id, async (event) => {
          if (event.status === 'cancelled') throw Object.assign(new Error('This event is already cancelled.'), { status: 409 });
          const plan = await cancellationPlan(svc, event);
          if (!plan.next) return null;
          return submitCateringPayment(base44, auth.user, event, {
            payment_type: plan.next.payment_type, amount: plan.next.amount, payment_method: body.payment_method,
            reference: String(body.reference || '').slice(0, 200), notes: `Event cancellation: ${plan.next.label}`,
            client_request_id: `${SETTLEMENT_PREFIX}${plan.next.payment_type}:${crypto.randomUUID()}`,
          });
        });
        if (!payment) break;
        submitted.push(payment.id);
        if (!selfApprove) break;
        const review = await reviewCateringPayment(base44, { payment_id: payment.id, decision: 'approve', confirm_underfunding: true }).catch(() => null);
        if (!review?.approved) break;
      }
      const event = await svc.entities.CateringEvent.get(auth.event.id);
      return Response.json({ submitted, plan: await cancellationPlan(svc, event) });
    }

    if (body.action === 'finalize') {
      const auth = await cateringAccess(base44, body.event_id);
      if (auth.error) return fail(auth.error, auth.status);
      if (auth.event.status === 'cancelled') return fail('This event is already cancelled.', 409);
      const plan = await cancellationPlan(svc, auth.event);
      if (!plan.ready) return Response.json({ error: 'Settle the cancellation fee first: payments are still pending or unsettled.', plan }, { status: 409 });
      const updated = await svc.entities.CateringEvent.update(auth.event.id, {
        status: 'cancelled', cancelled_date: new Date().toISOString(), cancelled_by: auth.user.email,
        cancellation_reason: String(body.reason || '').slice(0, 1000), cancellation_policy_id: plan.policy_id,
        cancellation_penalty_percentage: plan.fee_percentage, cancellation_penalty_amount: plan.fee_amount,
        deposit_status: plan.fee_kept > 0 ? 'retained' : plan.refunded > 0 ? 'refunded' : 'none', inventory_reserved: false,
      });
      await audit(base44, auth.user, 'update', 'CateringEvent', `Cancelled event ${auth.event.event_name}; fee ${plan.fee_amount} EGP settled`, { entityId: auth.event.id, entityName: auth.event.event_name, changes: { status: { from: auth.event.status, to: 'cancelled' }, cancellation_penalty_amount: plan.fee_amount } });
      // Tastings held for this event move to their reason's account; blocks land in Finance posting issues.
      const stock_posting = await runInventoryJob({ base44, svc: base44.asServiceRole, user: auth.user, admin: true, permissions: {} }, { inventory_entity: 'CateringEvent', source_id: auth.event.id })
        .catch((e) => { console.error('Tasting settlement failed:', e.message); return { blocked: true, message: e.message }; });
      return Response.json({ event: updated, plan, stock_posting });
    }
    return fail('Unknown action.', 400);
  } catch (error) {
    return fail(error.message, error.status || 500);
  }
}