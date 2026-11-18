import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';
import { audit } from '../_shared/auditLog.js';

/**
 * Create or update a chart-of-accounts entry. Requires BOTH financial_view and
 * admin_settings (platform admins pass). Only the listed fields are written.
 * Body: { id?, data: { account_number, account_name, category, sub_category, account_type, description, is_active } }
 */
const FIELDS = ['account_number', 'account_name', 'category', 'sub_category', 'account_type', 'description', 'is_active'];

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    for (const flag of ['financial_view', 'admin_settings']) {
      const c = await checkPermission(base44, user, flag);
      if (!c.allowed) return Response.json({ error: c.reason }, { status: c.status });
    }

    const { id, data = {} } = await req.json();
    const clean = Object.fromEntries(FIELDS.filter((f) => f in data).map((f) => [f, data[f]]));
    if (!clean.account_number || !clean.account_name)
      return Response.json({ error: 'account_number and account_name are required' }, { status: 400 });

    const svc = base44.asServiceRole.entities.GLAccount;
    const dupes = (await svc.filter({ account_number: clean.account_number })).filter((a) => a.id !== id);
    if (dupes.length) return Response.json({ error: `Account number ${clean.account_number} already exists` }, { status: 409 });

    const before = id ? await svc.get(id) : null;
    const account = id ? await svc.update(id, clean) : await svc.create(clean);
    await audit(base44, user, id ? 'update' : 'create', 'GLAccount',
      `${id ? 'Updated' : 'Created'} chart-of-accounts entry ${clean.account_number} ${clean.account_name}`, {
        entityId: account.id, entityName: `${clean.account_number} ${clean.account_name}`,
        changes: Object.fromEntries(Object.keys(clean).filter((k) => !before || before[k] !== clean[k]).map((k) => [k, { from: before?.[k] ?? null, to: clean[k] }])),
      });
    return Response.json({ account });
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
