import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';

// Creates a no-login, expiring link to a privately stored session report.
// Caller must be able to read the CashierSession (RLS decides).
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_uri, session_id, origin } = await req.json();
    if (!file_uri || !session_id || !origin) return Response.json({ error: 'file_uri, session_id and origin are required' }, { status: 400 });
    if (/^https?:\/\//i.test(file_uri)) return Response.json({ error: 'Only private files can be shared' }, { status: 400 });

    const session = await base44.entities.CashierSession.get(session_id).catch(() => null);
    if (!session) return Response.json({ error: 'Session not found or not allowed' }, { status: 403 });

    const settings = (await base44.asServiceRole.entities.ReportRecipientSettings.filter({ setting_key: 'report_recipients' }))[0];
    const days = Math.min(90, Math.max(1, Number(settings?.shared_report_link_days) || 7));
    const expires_at = new Date(Date.now() + days * 86400000).toISOString();
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    await base44.asServiceRole.entities.SharedReportLink.create({
      token, file_uri, expires_at, report_type: 'cashier_session', reference_id: session_id, shared_by: user.email, open_count: 0,
    });

    const base = String(origin).replace(/\/+$/, '');
    return Response.json({ url: `${base}/functions/openSharedReport?t=${token}`, expires_at, days });
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
