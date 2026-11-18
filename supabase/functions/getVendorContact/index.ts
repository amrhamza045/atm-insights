import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { isSafetyValveEmail } from '../_shared/platformRole.js';

// Vendor contact details for manual footers. Readable by any signed-in user; can_edit only for the safety-valve account.
async function handler(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const [rec] = await base44.asServiceRole.entities.VendorSupportInfo.filter({ setting_key: 'vendor_support' });
  return Response.json({
    email: rec?.support_email || '',
    website: rec?.website || '',
    mobile: rec?.mobile || '',
    can_edit: isSafetyValveEmail(user.email),
  });
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
