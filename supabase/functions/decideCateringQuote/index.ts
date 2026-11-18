import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { checkQuoteOwnership, checkQuoteDecidable } from '../_shared/cateringOwnership.js';
import { usersWithPermission } from '../_shared/permissionRecipients.js';
import { loadEmailConfig, sendAndLog } from '../_shared/emailDelivery.js';

/**
 * Customer portal: accept or reject one's own catering quote.
 * CateringQuote stays closed to customer writes — this is the only path, and it
 * writes nothing but the quote's status (plus the event's lifecycle status on
 * acceptance, so the booking moves on to deposit collection for staff).
 */
async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { quote_id: quoteId, decision, approved_total: approvedTotal } = await req.json();
    if (!quoteId) return Response.json({ error: 'quote_id is required' }, { status: 400 });
    if (decision !== 'accepted' && decision !== 'rejected')
      return Response.json({ error: "decision must be 'accepted' or 'rejected'" }, { status: 400 });

    const quote = await base44.asServiceRole.entities.CateringQuote.get(quoteId).catch(() => null);
    const event = quote ? await base44.asServiceRole.entities.CateringEvent.get(quote.event_id).catch(() => null) : null;

    const owned = checkQuoteOwnership({ user, quote, event });
    if (!owned.allowed) return Response.json({ error: owned.reason }, { status: 403 });

    const decidable = checkQuoteDecidable({ quote, event });
    if (!decidable.allowed) return Response.json({ error: decidable.reason }, { status: 409 });

    await base44.asServiceRole.entities.CateringQuote.update(quoteId, {
      status: decision,
      customer_decision_date: new Date().toISOString(),
      customer_decision_total: Number(approvedTotal) || quote.total || 0,
      staff_acknowledged: false,
    });

    let eventStatus = event.status;
    if (decision === 'accepted' && (event.status === 'enquiry' || event.status === 'quoted')) {
      eventStatus = 'deposit_pending';
      await base44.asServiceRole.entities.CateringEvent.update(event.id, { status: eventStatus });
    }

    // Alert staff by email — in-app alerting is driven by the quote's own state.
    try {
      const svc = base44.asServiceRole;
      const key = 'catering_quote_decision';
      const config = await loadEmailConfig(svc);
      const admins = config.on(key) && config.includesDefault(key) ? await usersWithPermission(svc, 'catering_approve') : [];
      const subject = `Catering ${decision}: ${event.event_name}`;
      const body =
        `${quote.client_name || 'A customer'} ${decision} the booking for "${event.event_name}" ` +
        `(${event.event_date}).\n\nApproved total: ${Number(approvedTotal) || quote.total || 0} EGP\n` +
        `Revision: ${quote.revision_number}\n\nOpen Catering → Approvals to review and act on it.`;
      if (config.on(key)) {
        const to = await config.recipientsFor(key, admins.map((a) => a.email));
        await sendAndLog(svc, { key, to, subject, body, context: event.event_name, context_id: event.id });
      }
    } catch (_) {
      // never block the customer's decision on notification failure
    }

    await audit(base44, user, decision === 'rejected' ? 'reject' : 'approve', 'CateringQuote',
      `Customer ${decision} quote revision ${quote.revision_number} for ${event.event_name}`,
      { entityId: quoteId, entityName: event.event_name, changes: { status: { from: quote.status, to: decision } } });
    return Response.json({ success: true, quote_id: quoteId, status: decision, event_status: eventStatus });
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
