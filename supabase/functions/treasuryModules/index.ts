import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { withFinanceLock } from '../_shared/financeAccess.js';
import { requireValue } from '../_shared/financeValidation.js';
import {
  readCustodyModule,
  saveCustodyConfiguration,
  submitCustodyRequest,
  decideCustodyRequest,
  canApproveCustody,
} from '../_shared/financeCustodyModule.js';
import {
  readExpensesModule,
  submitExpenseDisbursement,
  decideExpenseDisbursement,
  canApproveExpenses,
} from '../_shared/financeExpensesModule.js';
import { listExpenseTypes, saveExpenseType, toggleExpenseType } from '../_shared/financeExpenseTypes.js';

async function resolveTargetCompany(ctx, input) {
  const all = await ctx.svc.entities.FinanceCompany.filter({ is_active: { $ne: false } }, { sort: '-created_date', limit: 50 });
  const accessible = ctx.admin
    ? all.items
    : all.items.filter(
        (c) =>
          (c.member_emails || []).map((e) => e.toLowerCase()).includes(String(ctx.user.email || '').toLowerCase()) ||
          !ctx.permissions.branch_id ||
          (c.branch_ids || []).includes(ctx.permissions.branch_id)
      );

  if (input.company_id) {
    const found = accessible.find((c) => c.id === input.company_id);
    requireValue(found, 'Accounting company not found or outside your access.', 404);
    return { company: found, companies: accessible };
  }
  if (input.branch_id) {
    const byBranch = accessible.find((c) => (c.branch_ids || []).includes(input.branch_id));
    if (byBranch) return { company: byBranch, companies: accessible };
  }
  const prodFirst = accessible.find((c) => !c.is_test) || accessible[0] || null;
  return { company: prodFirst, companies: accessible };
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const input = await req.json().catch(() => ({}));
    const permissions = await getEffectivePermissions(base44, user);
    if (permissions.access_denied) return Response.json({ error: 'Access denied' }, { status: 403 });

    const ctx = {
      base44,
      svc: base44.asServiceRole,
      user,
      permissions,
      admin: user.role === 'admin' || permissions.users_manage === true,
      auditOperation: input.action || 'treasury',
    };

    if (input.action === 'pending_approvals') {
      const branchScope = !ctx.admin && permissions.branch_id ? { branch_id: permissions.branch_id } : {};
      const [custodyReqs, expenseDisbs] = await Promise.all([
        canApproveCustody(ctx)
          ? ctx.svc.entities.FinanceCustodyRequest.filter({ status: 'pending', ...branchScope }, { sort: '-created_date', limit: 100 })
          : Promise.resolve({ items: [] }),
        canApproveExpenses(ctx)
          ? ctx.svc.entities.FinanceExpenseDisbursement.filter({ status: 'pending', ...branchScope }, { sort: '-created_date', limit: 100 })
          : Promise.resolve({ items: [] }),
      ]);
      return Response.json({
        custody_requests: custodyReqs.items,
        expense_disbursements: expenseDisbs.items,
      });
    }

    const { company, companies } = await resolveTargetCompany(ctx, input);
    if (!company) {
      return Response.json({
        no_company: true,
        companies: [],
      });
    }

    const metaCompanies = companies.map((c) => ({
      id: c.id,
      name: c.name,
      currency: c.currency,
      is_test: !!c.is_test,
      branch_ids: c.branch_ids || [],
    }));

    if (input.action === 'custody_workspace') {
      const data = await readCustodyModule(ctx, company, input.branch_id || '');
      return Response.json({ ...data, companies: metaCompanies });
    }
    if (input.action === 'custody_config_save') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => saveCustodyConfiguration(ctx, fresh, input)));
    }
    if (input.action === 'custody_request_submit') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => submitCustodyRequest(ctx, fresh, input)));
    }
    if (input.action === 'custody_request_decide') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => decideCustodyRequest(ctx, fresh, input)));
    }

    if (input.action === 'expenses_workspace') {
      const data = await readExpensesModule(ctx, company, input.branch_id || '');
      return Response.json({ ...data, companies: metaCompanies });
    }
    if (input.action === 'expense_types') {
      return Response.json({ items: await listExpenseTypes(ctx, company, input.search || '') });
    }
    if (input.action === 'expense_type_save') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => saveExpenseType(ctx, fresh, input)));
    }
    if (input.action === 'expense_type_toggle') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => toggleExpenseType(ctx, fresh, input)));
    }
    if (input.action === 'expense_disbursement_submit') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => submitExpenseDisbursement(ctx, fresh, input)));
    }
    if (input.action === 'expense_disbursement_decide') {
      return Response.json(await withFinanceLock(ctx, company, (fresh) => decideExpenseDisbursement(ctx, fresh, input)));
    }

    return Response.json({ error: 'Unknown treasury action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Treasury request failed.' }, { status: error.status || 500 });
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
