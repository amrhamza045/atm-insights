import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { financeContext, financeCompany, branchQuery } from '../_shared/financeAccess.js';
import { syncCustomerAccounts } from '../_shared/customerAccountSync.js';
import { scopedAccounts, pageOf, upcomingOf } from '../_shared/customerAccountRead.js';

// Finance › Reporting › Our Customers: the saved customer receivables
// statements for a Finance company. Each call first folds in the quotes,
// payments and events changed since the last call, then reads the saved rows.
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await financeContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    const company = await financeCompany(ctx, input.company_id);
    const svc = base44.asServiceRole;
    let branchIds = branchQuery(ctx, company).branch_id.$in;
    if (input.branch_id) branchIds = branchIds.filter((id) => id === input.branch_id);
    if (!branchIds.length) return Response.json({ error: 'No access to this branch.' }, { status: 403 });
    const scope = { branchIds, from: isDay(input.from) ? input.from : null, to: isDay(input.to) ? input.to : null, search: String(input.search || '').slice(0, 80) };
    const today = new Date().toISOString().slice(0, 10);

    if (input.action === 'rebuild') return Response.json(await syncCustomerAccounts(svc, { full: true }));
    await syncCustomerAccounts(svc);
    if (input.action === 'list') return Response.json({ currency: company.currency, ...pageOf(await scopedAccounts(svc, scope), input) });
    if (input.action === 'detail') {
      const [account] = await scopedAccounts(svc, { ...scope, search: '', clientIds: [String(input.client_id || '')] });
      if (!account) return Response.json({ error: 'This customer has no account activity in the selected filters.' }, { status: 404 });
      return Response.json({ currency: company.currency, account: { ...account, upcoming: upcomingOf(account, today) } });
    }
    if (input.action === 'export') {
      const ids = Array.isArray(input.client_ids) && input.client_ids.length ? input.client_ids.map(String) : null;
      const accounts = (await scopedAccounts(svc, { ...scope, search: ids ? '' : scope.search, clientIds: ids }))
        .sort((a, b) => a.client_name.localeCompare(b.client_name)).map((a) => ({ ...a, upcoming: upcomingOf(a, today) }));
      return Response.json({ currency: company.currency, company: company.name, accounts });
    }
    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Customer accounts failed:', error.message);
    return Response.json({ error: error.message }, { status });
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
