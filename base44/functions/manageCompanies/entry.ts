import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { financeContext } from '../../shared/financeAccess.js';
import { companyAdmin } from '../../shared/companyAdmin.js';
import { audit } from '../../shared/auditLog.js';

export default async function(req) {
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