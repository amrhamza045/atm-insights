import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { audit } from '../_shared/auditLog.js';

/**
 * Equipment tab: pause or resume every custody chain email. Catering settings are
 * admin-only to write, so this one setting goes through here, gated on catering_view
 * (everyone who uses the Equipment tab). Body: { enabled: boolean }.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'catering_view');
    if (denied) return denied;
    const { enabled } = await req.json();
    if (typeof enabled !== 'boolean') return Response.json({ error: 'enabled must be true or false' }, { status: 400 });

    const svc = base44.asServiceRole;
    const [settings] = await svc.entities.CateringSettings.list();
    if (settings) await svc.entities.CateringSettings.update(settings.id, { custody_emails_enabled: enabled });
    else await svc.entities.CateringSettings.create({ custody_emails_enabled: enabled });

    await audit(base44, user, 'update', 'CateringSettings', `Custody emails ${enabled ? 'resumed' : 'stopped'} from the Equipment tab`, {
      entityId: settings?.id || null,
      entityName: 'Catering settings',
      changes: { custody_emails_enabled: { from: settings ? settings.custody_emails_enabled !== false : true, to: enabled } },
    });
    return Response.json({ custody_emails_enabled: enabled });
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
