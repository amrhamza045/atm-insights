/** Shared excess-deposit withdrawal rules: request (pending) and approval (posting). */
import { postPaymentToLedger, runWithRollback, snapshot, round2, loadEventMoney, fmtEGP } from './cateringPaymentPosting.js';
import { hasPolicy, companyToday } from './paymentPolicyEvent.js';
import { policyState, eventFirstPayment } from './paymentPolicyRules.js';
import { capturePaymentAccounts } from './cateringConfiguredPayment.js';

/** Current withdrawable excess, or an error message. */
export async function checkExcess(svc, event, value) {
  const before = await loadEventMoney(svc, event);
  let excess = round2(before.depositPaid - (Number(event.required_deposit_amount) || 0));
  // Payment policy: the first payment and every payment already due must stay on the event.
  if (hasPolicy(event)) {
    const today = await companyToday(svc);
    const { deposit, schedule } = policyState(event, { quoteTotal: Number(event.quote_total) || 0, grandTotal: before.grandTotal, totalPaid: before.totalPaid }, today);
    excess = round2(Math.min(before.depositPaid - deposit, before.totalPaid - schedule.requiredBy(today)));
  }
  if (excess <= 0) return { error: 'There is no excess deposit on this event to withdraw' };
  if (value > excess) return { error: `Withdrawal exceeds the excess deposit of ${fmtEGP(excess)} — the required deposit${hasPolicy(event) ? ' and the payments already due under the payment policy' : ''} must stay on the event`, excess };
  return { excess };
}

/** Maker-checker: whoever priced the event can't act on its withdrawal. */
export async function pricedByUser(svc, event, email) {
  if (!event.active_quote_id) return false;
  const quote = await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null);
  return !!quote?.created_by_email && quote.created_by_email === email;
}

/** Posts an approved pending withdrawal: ledger entry, status completed, event totals rebuilt. */
export async function postWithdrawal(svc, payment, event, approverEmail) {
  return runWithRollback(svc, event.id, async (track) => {
    const prev = { status: payment.status, approved_by: payment.approved_by ?? null, approved_date: payment.approved_date ?? null };
    const now = new Date().toISOString();
    const routing = payment.payment_method_id && payment.payment_account_snapshot ? {} : await capturePaymentAccounts(svc,event,{...payment,payment_date:now});
    const savedPayment = await svc.entities.CateringPayment.update(payment.id, { ...routing, status: 'completed', approved_by: approverEmail, approved_date: now, payment_date: now });
    track.undo(() => svc.entities.CateringPayment.update(payment.id, prev));

    const journal = await postPaymentToLedger(svc, savedPayment, event);
    track.journal(journal?.id);

    const after = await loadEventMoney(svc, event);
    const required = hasPolicy(event) ? eventFirstPayment(event, Number(event.quote_total) || 0, after.grandTotal) : Number(event.required_deposit_amount) || 0;
    const depositStatus = after.depositPaid <= 0 ? 'none' : required > 0 && after.depositPaid >= required ? 'paid' : 'partial';
    track.event(snapshot(event));
    await svc.entities.CateringEvent.update(event.id, {
      total_paid: after.totalPaid,
      deposit_paid_amount: after.depositPaid,
      balance_due: round2(after.grandTotal - after.totalPaid),
      deposit_status: depositStatus,
    });
    return { depositStatus, payment: savedPayment };
  });
}