import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkPermission } from '../../shared/requirePermission.js';
import { loadEmailConfig, sendAndLog } from '../../shared/emailDelivery.js';
import { opsKitchenStaff, clientEmailFor } from '../../shared/cateringEmailRecipients.js';
import { receiptAutoCovers } from '../../shared/receiptSettings.js';

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id: eventId, payment_id: paymentId, notify_operations: notifyOperations = false } = await req.json();
    if (!eventId || !paymentId) {
      return Response.json({ error: 'event_id and payment_id are required' }, { status: 400 });
    }

    const [event, payment] = await Promise.all([
      base44.asServiceRole.entities.CateringEvent.get(eventId).catch(() => null),
      base44.asServiceRole.entities.CateringPayment.get(paymentId).catch(() => null),
    ]);
    if (!event || !payment || payment.event_id !== event.id) {
      return Response.json({ error: 'Event or payment not found' }, { status: 404 });
    }
    if (payment.recorded_by !== user.email && !(await checkPermission(base44, user, 'catering_finance')).allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (payment.payment_type !== 'deposit' || payment.status !== 'completed') {
      return Response.json({ error: 'The deposit payment is not completed' }, { status: 409 });
    }
    // Each email has its own switch and recipients in Admin › Email.
    const svc = base44.asServiceRole;
    const config = await loadEmailConfig(svc);
    // While Catering › Settings › Client Receipt emails deposit receipts (PDF), the client gets that instead of this plain copy.
    const customerOn = config.on('catering_deposit_customer') && !(await receiptAutoCovers(svc, 'deposit'));
    const recorderOn = config.on('catering_deposit_recorder');
    const shouldNotifyOperations = notifyOperations && event.deposit_status === 'paid' && config.on('catering_ops_payment');

    const [employees, customerEmail] = await Promise.all([
      shouldNotifyOperations && config.includesDefault('catering_ops_payment') ? config.employees() : Promise.resolve([]),
      customerOn ? clientEmailFor(svc, event) : Promise.resolve(''),
    ]);
    const warnings = [];
    if (customerOn && !customerEmail) warnings.push("Customer email unavailable — add an email to the client record or invite them to the portal");
    if (recorderOn && config.includesDefault('catering_deposit_recorder') && !payment.recorded_by) {
      warnings.push('Recording staff email unavailable');
    }

    const depositConfirmed = event.deposit_status === 'paid';
    const subject = `${depositConfirmed ? 'Deposit confirmed' : 'Deposit payment received'} — ${event.event_name} on ${event.event_date}`;
    const text = [
      depositConfirmed
        ? 'The required catering deposit has been received and confirmed.'
        : 'A catering deposit payment has been received and recorded.',
      `Event: ${event.event_name || ''}`,
      `Date: ${event.event_date || ''} ${event.start_time || ''}`,
      `Client: ${event.client_name || ''}`,
      `Guests: ${event.guarantee_locked ? event.guaranteed_guests : event.expected_guests || 0}`,
      `Venue: ${event.location_type === 'off_site' ? `${event.venue_name || ''} ${event.venue_address || ''}` : event.branch_name || 'On site'}`,
      `Payment received: ${formatMoney(payment.amount)} (${(payment.payment_method || '').replace(/_/g, ' ')})`,
      `Reference: ${payment.reference || '—'}`,
      `Total deposits received: ${formatMoney(event.deposit_paid_amount)}`,
      `Remaining event balance: ${formatMoney(event.balance_due)}`,
      "Stock release and preparation remain subject to the event's operational approvals.",
    ].join('\n');

    const groups = [
      customerOn && ['catering_deposit_customer', customerEmail ? [customerEmail] : []],
      recorderOn && ['catering_deposit_recorder', payment.recorded_by ? [payment.recorded_by] : []],
      shouldNotifyOperations && ['catering_ops_payment', opsKitchenStaff(employees).map((e) => e.email)],
    ].filter(Boolean);
    // One email per address, counted under the first email that lists it.
    const seen = new Set();
    let sent = 0;
    let failed = 0;
    let customerSent = false;
    for (const [key, usual] of groups) {
      const all = await config.recipientsFor(key, usual);
      const to = all.filter((email) => !seen.has(email));
      to.forEach((email) => seen.add(email));
      if (all.length && !to.length) continue;
      const result = await sendAndLog(svc, { key, to, subject, text, context: event.event_name, context_id: event.id });
      sent += result.sent.length;
      failed += result.failures.length;
      if (customerEmail && result.sent.includes(customerEmail.toLowerCase())) customerSent = true;
    }
    return Response.json({
      sent,
      failed,
      // null = the customer receipt is turned off, so nothing was expected.
      customer_sent: !customerOn ? null : customerSent,
      operations_notified: shouldNotifyOperations,
      warnings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}