import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { financeContext } from '../_shared/financeAccess.js';
import { companyAdmin } from '../_shared/companyAdmin.js';
import { audit } from '../_shared/auditLog.js';

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await financeContext(base44);
    const input = await req.json().catch(() => ({}));
    ctx.auditOperation = `companies_${input.action}`;
    const result = await companyAdmin(ctx, input);
    if (input.action !== 'list') {
      const type = String(input.action).startsWith('delete') ? 'delete' : String(input.action).startsWith('create') ? 'create' : 'update';
      await audit(base44, ctx.user, type, String(input.action).includes('branch') ? 'Branch' : 'FinanceCompany', `Companies & Branches: ${input.action}`, { entityId: result.id });
    }
    return Response.json(result);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error('Companies request failed:', error.message);
    return Response.json({ error: error.message }, { status: error.status || 500 });
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
