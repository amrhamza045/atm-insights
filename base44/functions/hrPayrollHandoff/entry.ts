import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { financeCompany } from '../../shared/financeAccess.js';
import { handoffPayrollToFinance } from '../../shared/financeHrPayouts.js';

export default async function(req) {
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