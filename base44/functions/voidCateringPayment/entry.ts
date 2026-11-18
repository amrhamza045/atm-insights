import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { audit } from '../../shared/auditLog.js';
import { auditCateringPayment } from '../../shared/cateringPaymentAudit.js';
import { withCateringPaymentReviewLock } from '../../shared/cateringPaymentReviewLock.js';
import { authorizeFinanceOnEvent, runWithRollback, snapshot, round2, loadEventMoney, isOutgoing } from '../../shared/cateringPaymentPosting.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const reason = String(body.reason || '').trim();
    if (!reason) return Response.json({ error: 'A reason is required to void a payment' }, { status: 400 });

    const svc = base44.asServiceRole;
    const payment = body.payment_id ? await svc.entities.CateringPayment.get(body.payment_id).catch(() => null) : null;
    if (!payment) return Response.json({ error: 'Payment not found' }, { status: 404 });

    const auth = await authorizeFinanceOnEvent(base44, payment.event_id);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const { user, event, central } = auth;

    return await withCateringPaymentReviewLock(svc, event.id, async freshEvent => {
    const payment = await svc.entities.CateringPayment.get(body.payment_id);
    const event = freshEvent;
    if (!central && auth.permissions.branch_id && auth.permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    if (payment.status !== 'completed') return Response.json({ error: 'Only completed payments can be voided' }, { status: 409 });
    if (payment.opening_balance) return Response.json({ error: 'Opening advances cannot be voided. Correct them with a journal in Finance.' }, { status: 409 });
    // Maker-checker: whoever recorded the payment can't void it.
    if (!central && payment.recorded_by && payment.recorded_by === user.email)
      return Response.json({ error: 'You recorded this payment — a second finance user or an admin must void it.' }, { status: 403 });

    // Consistency guard: compute totals as they would be after this void.
    const others = (await svc.entities.CateringPayment.filter({ event_id: event.id }))
      .filter((p) => p.id !== payment.id && p.status === 'completed');
    const received = others.filter((p) => !isOutgoing(p.payment_type)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const credited = others.filter((p) => isOutgoing(p.payment_type)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (isOutgoing(payment.payment_type)) {
      const before = await loadEventMoney(svc, event);
      if (round2(received - credited) > round2(before.grandTotal))
        return Response.json({ error: `Voiding this ${payment.payment_type === 'penalty' ? 'penalty' : 'credit note'} would leave the event paid above its total. Void or refund the extra payments first.` }, { status: 409 });
    } else if (round2(received) < round2(credited)) {
      return Response.json({ error: `Voiding this payment would leave net paid (${round2(received)}) below what was already credited or kept as penalties (${round2(credited)}). Void the credit note or penalty first.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    let voidedPayment;
    const result = await runWithRollback(svc, event.id, async (track) => {
      const originals = await svc.entities.JournalEntry.filter({ reference_id: payment.id });

      // Mark voided (kept for audit); undo restores it to completed.
      voidedPayment = await svc.entities.CateringPayment.update(payment.id, { status: 'voided', voided_by: user.email, voided_date: now, void_reason: reason });
      track.undo(() => svc.entities.CateringPayment.update(payment.id, { status: 'completed', voided_by: '', voided_date: null, void_reason: '' }));

      for (const je of originals.filter((j) => j.reference_type !== 'catering_payment_void')) {
        const rev = await svc.entities.JournalEntry.create({
          branch_id: je.branch_id,
          branch_name: je.branch_name,
          entry_date: now,
          reference_type: 'catering_payment_void',
          reference_id: payment.id,
          revenue_source: 'catering',
          catering_event_id: je.catering_event_id,
          catering_event_name: je.catering_event_name,
          description: `VOID of: ${je.description} — ${reason}`,
          entries: (je.entries || []).map((l) => ({ ...l, debit: l.credit || 0, credit: l.debit || 0 })),
          total_debit: je.total_credit,
          total_credit: je.total_debit,
          is_balanced: true,
          posted: true,
        });
        track.journal(rev.id);
      }

      // Totals from the database only (voided payment is now excluded).
      const money = await loadEventMoney(svc, event);
      const required = Number(event.required_deposit_amount) || 0;
      const depositStatus = money.depositPaid <= 0 ? 'none' : required > 0 && money.depositPaid >= required ? 'paid' : 'partial';
      track.event(snapshot(event));
      await svc.entities.CateringEvent.update(event.id, {
        total_paid: money.totalPaid,
        deposit_paid_amount: money.depositPaid,
        balance_due: round2(money.grandTotal - money.totalPaid),
        deposit_status: depositStatus,
        ...(['confirmed', 'in_progress'].includes(event.status) && depositStatus !== 'paid' ? { status: 'deposit_pending' } : {}),
      });
      return { depositStatus, previous_status: event.status };
    });

    await auditCateringPayment(base44, user, event, payment, voidedPayment, 'reversal', 'voidCateringPayment');
    await audit(base44, user, 'update', 'CateringPayment',
      `Voided ${payment.payment_type || 'payment'} of ${round2(payment.amount)} EGP on ${event.event_name}: ${reason}`,
      { entityId: payment.id, entityName: event.event_name, changes: { status: { from: 'completed', to: 'voided' } } });
    return Response.json(result);
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}