import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkPermission } from '../../shared/requirePermission.js';

/**
 * Labor-cost totals for finance dashboards. Returns ONE row per branch per month
 * (salary, overtime, deductions, headcount) — never a per-person row, name or id.
 * Requires financial_view (platform admins pass). A user assigned to a branch
 * only ever gets that branch's totals.
 *
 * Row fields reuse SalaryRecord's names so dashboards can sum them unchanged.
 */
const SUM_FIELDS = [
  'base_salary', 'hourly_earnings', 'overtime_earnings', 'overtime_hours', 'total_hours',
  'regular_hours', 'bonus', 'deductions', 'penalty_deductions', 'borrowing_deductions',
  'attendance_deductions', 'gross_salary', 'net_salary',
];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const check = await checkPermission(base44, user, 'financial_view');
    if (!check.allowed) return Response.json({ error: check.reason }, { status: check.status });

    const branchId = user.role === 'admin' ? null : check.permissions?.branch_id || null;
    const query = branchId ? { branch_id: branchId } : {};
    const records = await base44.asServiceRole.entities.SalaryRecord.filter(query, '-month', 5000);

    const groups = {};
    for (const r of records) {
      const month = String(r.month || '').slice(0, 7);
      const key = `${r.branch_id || ''}|${month}`;
      if (!groups[key]) {
        groups[key] = { branch_id: r.branch_id || null, branch_name: r.branch_name || 'Unknown', month: `${month}-01`, headcount: 0, _people: new Set() };
        SUM_FIELDS.forEach((f) => (groups[key][f] = 0));
      }
      const g = groups[key];
      SUM_FIELDS.forEach((f) => (g[f] += Number(r[f]) || 0));
      g._people.add(r.employee_id);
    }

    const rows = Object.values(groups).map(({ _people, ...g }) => {
      SUM_FIELDS.forEach((f) => (g[f] = Math.round(g[f] * 100) / 100));
      return { ...g, headcount: _people.size };
    });
    rows.sort((a, b) => b.month.localeCompare(a.month));
    return Response.json({ rows, branch_scoped: !!branchId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}