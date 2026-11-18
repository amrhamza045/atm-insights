import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { financeCompany } from '../_shared/financeAccess.js';
import { handoffPayrollToFinance } from '../_shared/financeHrPayouts.js';

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    // HR can hand off payroll to Finance.
    const denied = await denyUnlessPermitted(base44, user, ['hr_edit']);
    if (denied) return denied;

    const { branch_id, month, company_id } = await req.json();
    if (!month) return Response.json({ error: 'Month is required.' }, { status: 400 });
    
    const company = await financeCompany({ svc: base44.asServiceRole, user }, company_id);
    const result = await handoffPayrollToFinance({ svc: base44.asServiceRole, user }, company, branch_id, month);
    
    return Response.json(result);
  } catch (error) {
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
