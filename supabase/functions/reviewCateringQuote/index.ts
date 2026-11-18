import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../_shared/platformRole.js';
import { isAutoApproveOn } from '../_shared/autoApproval.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from '../_shared/selfApprovalBypass.js';
import { refreshEventRequisitionBaseline } from '../_shared/requisitionBaseline.js';
import { eventFirstPayment } from '../_shared/paymentPolicyRules.js';

const OUTFLOWS = ['refund', 'deposit_withdrawal'];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const paxTotal = (lines = []) => lines.reduce((s, l) => {
  const m = String(l.name || '').match(/(\d+)\s*(persons?|pax)\b/i);
  return s + (m ? Number(m[1]) : 0);
}, 0);

// body: { quote_id, decision: 'approve' | 'reject', reason? }
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['approve', 'reject'].includes(body.decision)) return Response.json({ error: 'Choose approve or reject' }, { status: 400 });

    const permissions = await getEffectivePermissions(base44, user);
    const central = isCentralAdmin(user, permissions);
    if (!central && (!permissions || permissions.access_denied || permissions.catering_quote_approve !== true))
      return Response.json({ error: 'Forbidden: requires the Catering Quote Approval permission' }, { status: 403 });

    const quote = await svc.entities.CateringQuote.get(body.quote_id).catch(() => null);
    if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404 });
    if (quote.status !== 'pending_approval') return Response.json({ error: 'This quote has already been decided' }, { status: 409 });
    const event = await svc.entities.CateringEvent.get(quote.event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    if (event.status === 'cancelled') return Response.json({ error: 'This event is cancelled' }, { status: 400 });
    const autoSelf = body.auto === true && body.decision === 'approve' && await isAutoApproveOn(svc);
    const ownRevision = !autoSelf && String(quote.created_by_email || '').toLowerCase() === String(user.email || '').toLowerCase();
    if (ownRevision && !await holdsSelfApprovalBypass(svc, user))
      return Response.json({ error: 'You prepared this revision — another approver must decide it.' }, { status: 403 });

    if (body.decision === 'reject') {
      await svc.entities.CateringQuote.update(quote.id, { status: 'rejected', staff_response_note: body.reason || '' });
      audit(base44, user, 'catering_quote_rejected', 'CateringQuote', `Rejected revision ${quote.revision_number} for ${event.event_name}`, { entityId: quote.id }).catch(() => {});
      return Response.json({ ok: true, status: 'rejected' });
    }

    // Read everything first, then write — so a failed read changes nothing.
    const [payments, assignments, trips] = await Promise.all([
      svc.entities.CateringPayment.filter({ event_id: event.id, status: 'completed' }),
      svc.entities.CateringAssignment.filter({ event_id: event.id }),
      svc.entities.CateringTrip.filter({ event_id: event.id }),
    ]);
    const sum = (list, fn, val) => round2(list.filter(fn).reduce((s, x) => s + (Number(val(x)) || 0), 0));
    const amt = (p) => p.amount;
    const outgoing = sum(payments, (p) => OUTFLOWS.includes(p.payment_type), amt);
    const floor = Math.max(0, round2(sum(payments, (p) => !OUTFLOWS.includes(p.payment_type), amt) - outgoing));
    if ((quote.total || 0) + 0.005 < floor)
      return Response.json({ error: `Total ${quote.total} EGP is below the ${floor.toFixed(2)} EGP already retained for this event.` }, { status: 400 });

    const service = sum(assignments, (a) => a.status !== 'released', (a) => a.estimated_cost)
      + sum(trips, (t) => t.stage !== 'cancelled', (t) => t.estimated_transport_cost);
    const grand = round2((Number(quote.total) || 0) + service);
    const totalPaid = floor;
    const depositPaid = Math.max(0, round2(sum(payments, (p) => p.payment_type === 'deposit', amt) - outgoing));
    const pct = Number(quote.deposit_percentage ?? event.deposit_percentage) || 0;
    // Booked under a payment policy: the deposit is the policy's first payment, whatever the quote says.
    const required = event.payment_policy_id ? eventFirstPayment(event, Number(quote.total) || 0, grand)
      : Number(quote.required_deposit) > 0 ? round2(quote.required_deposit) : round2(((Number(quote.total) || 0) * pct) / 100);
    const depositStatus = depositPaid <= 0 ? 'none' : required > 0 && depositPaid >= required ? 'paid' : 'partial';
    const covered = depositStatus === 'paid' || required <= 0;
    const demote = (event.status === 'confirmed' || event.status === 'in_progress') && depositStatus !== 'paid';
    const requeue = !covered && (event.reservation_status === 'reserved' || event.reservation_status === 'shortfall');
    const pax = paxTotal(quote.line_items);

    const eventPatch = {
      active_quote_id: quote.id,
      active_quote_revision: quote.revision_number,
      quote_total: quote.total,
      ...(pax > 0 ? { expected_guests: pax } : {}),
      total_paid: totalPaid,
      deposit_paid_amount: depositPaid,
      required_deposit_amount: required,
      balance_due: round2(grand - totalPaid),
      deposit_status: depositStatus,
      ...(demote ? { status: 'deposit_pending' } : {}),
      ...(requeue ? { reservation_status: 'pending_approval', reservation_approved_by: '', reservation_approved_date: '' } : {}),
    };
    const eventBefore = Object.fromEntries(Object.keys(eventPatch).map((k) => [k, event[k] ?? null]));
    const prevId = event.active_quote_id && event.active_quote_id !== quote.id ? event.active_quote_id : null;

    // Write all three records; if any write fails, undo the ones that succeeded.
    const done = [];
    try {
      await svc.entities.CateringEvent.update(event.id, eventPatch); done.push('event');
      if (prevId) { await svc.entities.CateringQuote.update(prevId, { status: 'superseded' }); done.push('prev'); }
      await svc.entities.CateringQuote.update(quote.id, { status: 'active', acknowledged_by: user.email, acknowledged_date: new Date().toISOString() });
    } catch (err) {
      if (done.includes('prev')) await svc.entities.CateringQuote.update(prevId, { status: 'active' }).catch(() => {});
      if (done.includes('event')) await svc.entities.CateringEvent.update(event.id, eventBefore).catch(() => {});
      return Response.json({ error: `Approval could not be completed and was rolled back: ${err.message}` }, { status: 500 });
    }

    await refreshEventRequisitionBaseline(svc, { ...event, ...eventPatch }, quote).catch(() => {});
    audit(base44, user, 'catering_quote_approved', 'CateringQuote', `Approved revision ${quote.revision_number} (${quote.total} EGP) for ${event.event_name}`, { entityId: quote.id }).catch(() => {});
    if (ownRevision) await auditSelfApproval(svc, user, 'CateringQuote', quote.id, `quote revision ${quote.revision_number} for ${event.event_name}`);
    return Response.json({ ok: true, status: 'active', covered, required, demoted: demote, requeued: requeue, previous_quote_id: prevId });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
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
