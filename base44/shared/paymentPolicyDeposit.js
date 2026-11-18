// Deposits on events booked under a payment policy (Catering › Settings › Payment Policies).
import { eventFirstPayment } from './paymentPolicyRules.js';
import { round2, fmtEGP } from './cateringPaymentPosting.js';

/**
 * The least a deposit may be under the event's payment policy: what the policy's first payment
 * (the required deposit) still needs after the deposits already paid, never more than the
 * outstanding balance. 0 without a policy, or once the first payment is complete.
 * money = loadEventMoney(...).
 */
export function policyDepositMinimum(event, money) {
  if (!event?.payment_policy_id) return 0;
  const first = eventFirstPayment(event, Number(event.quote_total) || 0, money.grandTotal);
  return round2(Math.min(money.remaining, Math.max(0, first - money.depositPaid)));
}

export const policyDepositError = (event, minimum) =>
  `The "${event.payment_policy_name || event.payment_policy?.name || ''}" payment policy needs at least ${fmtEGP(minimum)} in this deposit to complete its first payment.`;