import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { audit } from '../../shared/auditLog.js';
import { auditCateringPayment } from '../../shared/cateringPaymentAudit.js';
import { withCateringPaymentReviewLock } from '../../shared/cateringPaymentReviewLock.js';
import { fmtEGP } from '../../shared/cateringPaymentPosting.js';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../../shared/platformRole.js';
import { selfApprovalReason } from '../../shared/autoApproval.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from '../../shared/selfApprovalBypass.js';
import { checkExcess, pricedByUser, postWithdrawal } from '../../shared/depositWithdrawal.js';

// body: { payment_id, decision: 'approve' | 'reject', reason? }
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const svc = base44.asServiceRole;
    const payment = await svc.entities.CateringPayment.get(body.payment_id).catch(() => null);
    if (!payment || payment.payment_type !== 'deposit_withdrawal') return Response.json({ error: 'Withdrawal request not found' }, { status: 404 });
    if (payment.status !== 'pending') return Response.json({ error: 'This request has already been decided' }, { status: 400 });

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const permissions = await getEffectivePermissions(base44, user);
    const central = isCentralAdmin(user, permissions);
    if (!central && (!permissions || permissions.access_denied || permissions.deposit_withdrawal_approve !== true))
      return Response.json({ error: 'Forbidden: requires the Catering Deposit Withdrawals approval permission' }, { status: 403 });
    const event = await svc.entities.CateringEvent.get(payment.event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });

    return await withCateringPaymentReviewLock(svc, event.id, async freshEvent => {
    const payment = await svc.entities.CateringPayment.get(body.payment_id);
    const event = freshEvent;
    if (payment.status !== 'pending') return Response.json({ error: 'This request has already been decided' }, { status: 409 });
    if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    if (!['approve', 'reject'].includes(body.decision)) return Response.json({ error: 'Choose approve or reject' }, { status: 400 });
    const own = payment.recorded_by_id === user.id || String(payment.recorded_by || '').toLowerCase() === user.email.toLowerCase();
    const selfReason = own ? await selfApprovalReason(svc, central, permissions, 'deposit_withdrawal_approve', user) : null;
    const selfApproved = !!selfReason;
    if (own && !selfApproved)
      return Response.json({ error: 'You requested this withdrawal — another finance user must decide it.' }, { status: 403 });

    if (body.decision === 'reject') {
      const reason = (body.reason || '').trim();
      if (!reason) return Response.json({ error: 'A rejection reason is required' }, { status: 400 });
      const decidedPayment = await svc.entities.CateringPayment.update(payment.id, {
        status: 'rejected', rejection_reason: reason, approved_by: user.email, approved_date: new Date().toISOString(),
      });
      await auditCateringPayment(base44, user, event, payment, decidedPayment, 'reject', 'approveDepositWithdrawal');
      await audit(base44, user, 'update', 'CateringPayment',
        `Rejected ${fmtEGP(payment.amount)} deposit withdrawal on ${event.event_name}: ${reason}`,
        { entityId: payment.id, entityName: event.event_name });
      return Response.json({ rejected: true });
    }

    const pricedBypass = !central && !selfApproved && await pricedByUser(svc, event, user.email);
    if (pricedBypass && !await holdsSelfApprovalBypass(svc, user))
      return Response.json({ error: 'You priced this event — a second finance user or an admin must approve.' }, { status: 403 });
    const check = await checkExcess(svc, event, Number(payment.amount));
    if (check.error) return Response.json(check, { status: 400 });

    const { payment: decidedPayment, ...result } = await postWithdrawal(svc, payment, event, user.email);
    await auditCateringPayment(base44, user, event, payment, decidedPayment, 'approve', 'approveDepositWithdrawal');
    if (selfReason === 'bypass' || pricedBypass)
      await auditSelfApproval(svc, user, 'CateringPayment', payment.id, `${fmtEGP(payment.amount)} deposit withdrawal on ${event.event_name}`);
    await audit(base44, user, 'update', 'CateringPayment',
      `Approved ${fmtEGP(payment.amount)} excess deposit withdrawal on ${event.event_name}`,
      { entityId: payment.id, entityName: event.event_name });
    return Response.json({ approved: true, ...result });
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}