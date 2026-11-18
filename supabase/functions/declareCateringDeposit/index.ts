import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { checkQuoteOwnership, checkDepositDeclarable } from '../_shared/cateringOwnership.js';

const OFFLINE_METHODS = ['bank_transfer', 'instapay', 'wallet'];

/**
 * Customer portal: declare that an offline deposit transfer has been sent
 * (bank transfer / InstaPay / mobile wallet).
 *
 * This deliberately creates NO CateringPayment record — nothing financial is
 * written from a customer's say-so. It only parks the event in
 * deposit_pending_verification with the reference staff need to check the funds.
 * A Catering Officer/Manager then records the payment from the Payments tab,
 * which runs the existing confirm → reserve stock → plan production path.
 */
async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id: eventId, method, reference } = await req.json();
    if (!eventId) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!OFFLINE_METHODS.includes(method))
      return Response.json({ error: 'Unsupported payment method' }, { status: 400 });
    const ref = (reference || '').trim();
    if (ref.length < 3)
      return Response.json({ error: 'A transfer reference is required so we can find your payment.' }, { status: 400 });

    const event = await base44.asServiceRole.entities.CateringEvent.get(eventId).catch(() => null);
    const quote = event?.active_quote_id
      ? await base44.asServiceRole.entities.CateringQuote.get(event.active_quote_id).catch(() => null)
      : null;

    const owned = checkQuoteOwnership({ user, quote, event });
    if (!owned.allowed) return Response.json({ error: owned.reason }, { status: 403 });

    const declarable = checkDepositDeclarable({ quote, event });
    if (!declarable.allowed) return Response.json({ error: declarable.reason }, { status: 409 });

    await base44.asServiceRole.entities.CateringEvent.update(eventId, {
      status: 'deposit_pending_verification',
      deposit_declared_method: method,
      deposit_declared_reference: ref,
      deposit_declared_date: new Date().toISOString(),
      deposit_declared_amount: event.required_deposit_amount || 0,
    });

    await audit(base44, user, 'update', 'CateringEvent',
      `Customer declared deposit of ${event.required_deposit_amount || 0} EGP by ${method} (ref ${ref})`,
      { entityId: eventId, entityName: event.event_name });
    return Response.json({ success: true, status: 'deposit_pending_verification' });
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
