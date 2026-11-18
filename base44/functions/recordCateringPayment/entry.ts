import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { submitCateringPayment } from '../../shared/cateringPaymentSubmit.js';
import { reviewCateringPayment } from '../../shared/cateringPaymentReview.js';
import { editPendingCateringPayment } from '../../shared/cateringPaymentEdit.js';
import { pendingCateringPayments, paymentReviewContext, paymentReviewBranch } from '../../shared/cateringPaymentReviewAccess.js';
import { canSelfApprove } from '../../shared/autoApproval.js';
import { paymentCompany } from '../../shared/cateringConfiguredPayment.js';
import { financePaymentMethods } from '../../shared/financePaymentMethods.js';
import { authorizeFinanceOnEvent, round2, loadEventMoney, fmtEGP } from '../../shared/cateringPaymentPosting.js';
import { policyDepositMinimum, policyDepositError } from '../../shared/paymentPolicyDeposit.js';
import { withCateringPaymentReviewLock } from '../../shared/cateringPaymentReviewLock.js';

const TYPES = ['deposit', 'final_balance', 'additional', 'refund', 'penalty'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (body.action === 'edit') return Response.json(await editPendingCateringPayment(base44, body));
    if (body.action === 'review') return Response.json(await reviewCateringPayment(base44, body));
    if (body.action === 'pending') return Response.json(await pendingCateringPayments(base44, body));
    if (body.action === 'payment_methods') {
      const ctx=await paymentReviewContext(base44);
      if(typeof body.event_id!=='string'||!body.event_id)return Response.json({error:'Select an event.'},{status:400});
      const event=await ctx.svc.entities.CateringEvent.get(body.event_id);paymentReviewBranch(ctx,event);
      const company=await paymentCompany(ctx.svc,event.branch_id);
      const page=await financePaymentMethods(ctx,company,{action:'payment_methods',active_only:true,cursor:body.cursor});
      return Response.json({...page,items:page.items.map(({id,code,name})=>({id,code,name}))});
    }
    const auth = await authorizeFinanceOnEvent(base44, body.event_id);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const { user, event } = auth;
    const svc = base44.asServiceRole;


    const amount = round2(body.amount);
    const type = body.payment_type;
    if (amount <= 0) return Response.json({ error: 'Enter an amount' }, { status: 400 });
    if (!TYPES.includes(type)) return Response.json({ error: 'Invalid payment type' }, { status: 400 });
    // Totals come from the database only — any total/balance in the request is ignored.
    const money = await loadEventMoney(svc, event);
    const { grandTotal } = money;
    const paidSoFar = money.totalPaid;
    if (type === 'refund' && amount > paidSoFar)
      return Response.json({ error: `Refund exceeds the amount paid on this event (${fmtEGP(paidSoFar)})` }, { status: 400 });
    // A penalty is kept from what the client has paid, so it can't be more than that.
    if (type === 'penalty' && amount > paidSoFar)
      return Response.json({ error: `A penalty is kept from what the client has paid, so it can't exceed ${fmtEGP(paidSoFar)}` }, { status: 400 });
    if (['deposit', 'final_balance', 'additional'].includes(type) && amount > money.remaining)
      return Response.json({
        error: grandTotal <= 0 ? 'This event has no total yet' : `Amount exceeds the remaining balance of ${fmtEGP(money.remaining)} (event total ${fmtEGP(grandTotal)})`,
        remaining_balance: money.remaining,
      }, { status: 400 });

    // A deposit can't be smaller than what the event's payment policy still needs for its first payment,
    // nor than the amount its % box gives (the percentage × the event total in the database).
    let depositMinimum = {};
    if (type === 'deposit') {
      const pct = body.deposit_percent;
      if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100)
        return Response.json({ error: 'Enter the deposit percentage (0 to 100)' }, { status: 400 });
      // One-cent allowance: the screen rounds staffing and logistics separately before adding them up.
      const policyMin = policyDepositMinimum(event, money);
      if (round2(policyMin - amount) > 0.01)
        return Response.json({ error: policyDepositError(event, policyMin) }, { status: 400 });
      const minDeposit = round2((grandTotal * pct) / 100);
      if (round2(minDeposit - amount) > 0.01)
        return Response.json({ error: `A ${pct}% deposit must be at least ${fmtEGP(minDeposit)}` }, { status: 400 });
      depositMinimum = { minimum_percent: pct, minimum_amount: Math.min(Math.max(minDeposit, policyMin), amount) };
    }

    // Warn, don't block: a refund or penalty that drops the deposit below its floor needs explicit confirmation.
    const floor = Number(event.required_deposit_amount) || 0;
    if ((type === 'refund' || type === 'penalty') && event.status !== 'cancelled' && floor > 0 && !body.confirm_underfunding) {
      const projectedDeposit = Math.max(0, round2(money.depositPaid - amount));
      if (projectedDeposit < floor) return Response.json({
        warning: 'below_deposit_floor',
        required_deposit: floor,
        deposit_paid: money.depositPaid,
        projected_deposit: projectedDeposit,
        shortfall: round2(floor - projectedDeposit),
      });
    }

    // One submission = one payment: the form's one-time ID is checked under the event's payment lock,
    // so repeated clicks or retries of the same submission can never record it twice.
    const requestId = typeof body.client_request_id === 'string' ? body.client_request_id.slice(0, 100) : '';
    const payment = await withCateringPaymentReviewLock(svc, event.id, async () => {
      if (requestId && (await svc.entities.CateringPayment.filter({ event_id: event.id, client_request_id: requestId })).length)
        throw Object.assign(new Error('This payment was already submitted.'), { status: 409 });
      return submitCateringPayment(base44, user, event, {
        payment_type: type, amount, payment_method: body.payment_method,
        reference: body.reference || '', receipt_url: body.receipt_url || '', ...depositMinimum,
        ...(requestId ? { client_request_id: requestId } : {}),
      });
    });
    // Self-approval: when the submitter holds Catering Payment Approval (and the switch is on), run the
    // normal review as them, carrying the deposit-floor confirmation they already gave. Any refusal leaves it pending.
    if (await canSelfApprove(svc, auth.central, auth.permissions, 'catering_payment_approve', auth.user)) {
      const auto = await reviewCateringPayment(base44, { payment_id: payment.id, decision: 'approve', confirm_underfunding: body.confirm_underfunding === true }).catch(() => null);
      if (auto?.approved) return Response.json({ ...auto, pending: false, auto_approved: true, queuesReservation: !!auto.queuesReservation });
    }
    return Response.json({ payment, event, pending: true, queuesReservation: false, deposit_status: event.deposit_status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}