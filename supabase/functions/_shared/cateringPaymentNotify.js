/**
 * Payment emails sent by recordCateringPayment after the payment is saved, so
 * they go out even if the browser closes. Same rules the screen used:
 * - deposit → notifyCateringDepositConfirmed (customer + recorder; Operations/
 *   Kitchen only when this payment first makes the deposit paid)
 * - other non-refund payments → Operations/Kitchen staff email
 * Each email follows its Admin › Email switch. Failures are reported, never undo the payment.
 */
import { loadEmailConfig, sendAndLog } from './emailDelivery.js';
import { opsKitchenStaff } from './cateringEmailRecipients.js';

const money = (v) => `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

export async function sendPaymentNotifications(base44, { event, payment, previousDepositStatus }) {
  if (event.status === 'cancelled' || payment.payment_type === 'refund') return { skipped: true };
  try {
    if (payment.payment_type === 'deposit') {
      const res = await base44.functions.invoke('notifyCateringDepositConfirmed', {
        event_id: event.id,
        payment_id: payment.id,
        notify_operations: event.deposit_status === 'paid' && previousDepositStatus !== 'paid',
      });
      return res.data;
    }
    const svc = base44.asServiceRole;
    const key = 'catering_ops_payment';
    const config = await loadEmailConfig(svc);
    if (!config.on(key)) return { skipped: true };
    const staff = config.includesDefault(key) ? await config.employees() : [];
    const to = await config.recipientsFor(key, opsKitchenStaff(staff).map((e) => e.email));
    const subject = `Event confirmed — ${event.event_name} on ${event.event_date}`;
    const body = [
      'A catering payment has been recorded for this confirmed event.',
      `Event: ${event.event_name || ''}`,
      `Date: ${event.event_date || ''} ${event.start_time || ''}`,
      `Client: ${event.client_name || ''}`,
      `Guests: ${event.guarantee_locked ? event.guaranteed_guests : event.expected_guests || 0}`,
      `Venue: ${event.location_type === 'off_site' ? `${event.venue_name || ''} ${event.venue_address || ''}` : event.branch_name || 'On site'}`,
      `Payment received: ${money(payment.amount)} (${(payment.payment_method || '').replace(/_/g, ' ')})`,
      `Reference: ${payment.reference || '—'}`,
      `Total deposits received: ${money(event.deposit_paid_amount)}`,
      `Remaining event balance: ${money(event.balance_due)}`,
      "Stock release and preparation remain subject to the event's operational approvals.",
    ].join('\n');
    const { sent, failures } = await sendAndLog(svc, { key, to, subject, text: body, context: event.event_name, context_id: event.id });
    return { sent: sent.length, failed: failures.length, warnings: [] };
  } catch (error) {
    console.error('Payment notifications failed', error);
    return { error: error.message, warnings: ['Payment saved, but the payment emails could not be sent'] };
  }
}