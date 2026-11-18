import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../_shared/platformRole.js';
import { round2, loadEventMoney, fmtEGP } from '../_shared/cateringPaymentPosting.js';
import { policyGate } from '../_shared/paymentPolicyEvent.js';

/**
 * Server-side Confirm & Start gate.
 * phase "validate": re-checks deposit coverage from the live ledger (no writes besides totals).
 * phase "start": re-checks again, then locks the quote and moves the event to in_progress.
 * Events booked under a payment policy are refused while the booking is on approval hold or
 * wasn't approved, or a payment is overdue; the policy's first payment is the deposit to cover.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { event_id, phase = 'validate' } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });

    const permissions = await getEffectivePermissions(base44, user);
    const central = isCentralAdmin(user, permissions);
    if (!central && (!permissions || permissions.access_denied || !(permissions.catering_edit || permissions.catering_finance || permissions.catering_approve)))
      return Response.json({ error: 'Forbidden: requires catering manager or finance access' }, { status: 403 });

    const svc = base44.asServiceRole;
    const event = await svc.entities.CateringEvent.get(event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    if (event.status !== 'confirmed')
      return Response.json({ error: `Event must be confirmed to start operations (current: ${String(event.status).replace(/_/g, ' ')})` }, { status: 409 });

    const quote = event.active_quote_id ? await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null) : null;
    if (!quote) return Response.json({ error: 'This event has no active quote to lock.' }, { status: 409 });

    const gate = await policyGate(svc, event);
    if (gate.blocked) return Response.json({ error: gate.blocked, code: 'payment_policy' }, { status: 409 });

    const stored = Number(quote.required_deposit) || 0;
    const pct = Number(quote.deposit_percentage ?? event.deposit_percentage) || 0;
    const required = gate.state ? gate.state.deposit : round2(stored > 0 ? stored : ((Number(quote.total) || 0) * pct) / 100);
    const money = gate.state ? gate.state.money : await loadEventMoney(svc, event);
    const covered = required > 0 && money.depositPaid >= required;

    if (!covered) {
      await svc.entities.CateringEvent.update(event.id, {
        total_paid: money.totalPaid,
        deposit_paid_amount: money.depositPaid,
        balance_due: round2(money.grandTotal - money.totalPaid),
        deposit_status: money.depositPaid <= 0 ? 'none' : 'partial',
        required_deposit_amount: required,
        status: 'deposit_pending',
      });
      const source = gate.state ? `The "${gate.event.payment_policy_name}" payment policy` : 'The active quote';
      return Response.json({
        error: `${source} requires a deposit of ${fmtEGP(required)} but only ${fmtEGP(money.depositPaid)} is covered by recorded payments (refunds/credit notes included). Record the additional deposit first.`,
        code: 'deposit_not_covered',
      }, { status: 409 });
    }

    if (phase !== 'start') return Response.json({ ok: true, required, deposit_paid: money.depositPaid });

    await svc.entities.CateringQuote.update(quote.id, { status: 'accepted' });
    await svc.entities.CateringEvent.update(event.id, { status: 'in_progress', deposit_status: 'paid', deposit_paid_amount: money.depositPaid });
    await audit(base44, user, 'update', 'CateringEvent',
      `Confirmed event operations — moved to In Progress (deposit ${fmtEGP(money.depositPaid)} of ${fmtEGP(required)} verified server-side)`,
      { entityId: event.id, entityName: event.event_name, changes: { status: { from: event.status, to: 'in_progress' } } });
    return Response.json({ ok: true, status: 'in_progress' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
