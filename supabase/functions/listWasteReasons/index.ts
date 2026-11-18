import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
// Active waste reasons for one branch's finance company, for the inventory waste popup.
// Staff only; returns names and groups, never the linked accounts.
async function handler(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const perms = user.data || {};
  if (user.role !== 'admin' && !perms.perm_is_staff && !perms.perm_is_central_admin) return Response.json({ error: 'Staff only.' }, { status: 403 });
  const { branch_id } = await req.json().catch(() => ({}));
  if (!branch_id || typeof branch_id !== 'string') return Response.json({ items: [] });
  if (user.role !== 'admin' && perms.perm_has_branch && perms.perm_branch_id && perms.perm_branch_id !== branch_id) return Response.json({ error: 'Branch outside your access.' }, { status: 403 });
  const svc = base44.asServiceRole.entities;
  const [company] = await svc.FinanceCompany.filter({ branch_ids: branch_id }, 'created_date', 1);
  if (!company) return Response.json({ items: [] });
  const reasons = await svc.FinanceWasteReason.filter({ company_id: company.id, is_active: true }, 'name', 200);
  return Response.json({ items: reasons.map(({ id, code, name, reason_group, treatment }) => ({ id, code, name, reason_group, treatment: treatment || 'waste' })) });
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
