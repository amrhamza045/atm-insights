import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { activePaymentMethods } from '../../shared/paymentMethodChoice.js';

// "Paid from" choices for payroll payouts and staff advances: the active payment methods
// (name and code only) of the company that owns the branch. Accounts stay in Finance.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, ['finance_edit', 'finance_view', 'finance_journal_approve', 'hr_edit']);
    if (denied) return denied;
    const { branch_id, include_custody } = await req.json().catch(() => ({}));
    if (typeof branch_id !== 'string' || !branch_id) return Response.json({ error: 'Select a branch.' }, { status: 400 });
    const methods = await activePaymentMethods(base44.asServiceRole, branch_id);
    let custodies = [];
    if (include_custody && methods.length) {
      const companies = await base44.asServiceRole.entities.FinanceCompany.filter({ branch_ids: branch_id }, { limit: 1 });
      const company = companies.items?.[0];
      if (company) {
        custodies = (await base44.asServiceRole.entities.FinanceCustody.filter({ company_id: company.id, status: 'active' }, { limit: 200 })).items;
      }
    }
    return Response.json({ items: methods.map((m) => ({ code: m.code, name: m.name, is_default: !!m.is_default })), custodies: custodies.map(c => ({ id: c.id, employee_name: c.employee_name, balance: c.balance, currency: c.currency })) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}