import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { submitCateringPayment } from '../../shared/cateringPaymentSubmit.js';
import { authorizeFinanceOnEvent, round2, loadEventMoney, fmtEGP } from '../../shared/cateringPaymentPosting.js';
import { reviewCateringPayment } from '../../shared/cateringPaymentReview.js';
import { canSelfApprove } from '../../shared/autoApproval.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from '../../shared/selfApprovalBypass.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const auth = await authorizeFinanceOnEvent(base44, body.event_id);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const { user, event, central } = auth;
    const svc = base44.asServiceRole;

    const value = round2(body.amount);
    if (value <= 0) return Response.json({ error: 'Credit note amount must be greater than zero' }, { status: 400 });

    const before = await loadEventMoney(svc, event);
    // Credit notes draw on the deposits liability only (deposits − withdrawals − prior refunds).
    if (before.depositPaid <= 0)
      return Response.json({ error: 'There is no deposit on this event to refund — a credit note cannot be issued', available_deposit: 0 }, { status: 400 });
    if (value > before.depositPaid)
      return Response.json({ error: `Credit note exceeds the refundable deposit on this event (${fmtEGP(before.depositPaid)})`, available_deposit: before.depositPaid }, { status: 400 });

    // Warn, don't block: dropping below the required deposit needs explicit confirmation.
    const floor = Number(event.required_deposit_amount) || 0;
    const projectedDeposit = Math.max(0, round2(before.depositPaid - value));
    if (event.status !== 'cancelled' && floor > 0 && projectedDeposit < floor && !body.confirm_underfunding) {
      return Response.json({
        warning: 'below_deposit_floor',
        required_deposit: floor,
        deposit_paid: before.depositPaid,
        projected_deposit: projectedDeposit,
        shortfall: round2(floor - projectedDeposit),
      });
    }

    // Maker-checker, as on the screen: whoever priced the event can't credit it, unless they hold Self-approve.
    let pricedBypass = false;
    if (!central && event.active_quote_id) {
      const quote = await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null);
      pricedBypass = !!quote?.created_by_email && quote.created_by_email === user.email;
      if (pricedBypass && !await holdsSelfApprovalBypass(svc, user))
        return Response.json({ error: 'You priced this event — a second Catering Manager or an admin must issue the credit note.' }, { status: 403 });
    }

    const number = `CN-${Date.now().toString().slice(-8)}`;
    const payment = await submitCateringPayment(base44, user, event, {
      payment_type: 'refund', amount: value, payment_method: body.payment_method,
      reference: number, receipt_url: body.receipt_url || '', credit_note: true,
      notes: `Credit note ${number}: ${body.reason || 'billing correction'}`,
    });
    if (pricedBypass) await auditSelfApproval(svc, user, 'CateringPayment', payment.id, `credit note ${number} on ${event.event_name}, an event they priced`);
    // Self-approval, as for other catering payments: approved at once when the issuer holds Catering Payment Approval.
    if (await canSelfApprove(svc, central, auth.permissions, 'catering_payment_approve', user)) {
      const auto = await reviewCateringPayment(base44, { payment_id: payment.id, decision: 'approve', confirm_underfunding: body.confirm_underfunding === true }).catch(() => null);
      if (auto?.approved) return Response.json({ payment: auto.payment, number, pending: false, auto_approved: true, depositStatus: auto.deposit_status, demoted: auto.event?.status === 'deposit_pending' && event.status !== 'deposit_pending' });
    }
    return Response.json({ payment, number, pending: true, depositStatus: event.deposit_status, demoted: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}