import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

/**
 * Catering labor cost without exposing pay rates. Never returns hourly_rate,
 * fixed_salary or any other EmployeePrivate field.
 *
 * action "costs" (default): { employee_ids, hours } ->
 *   { costs: { id: cost for these hours }, total, missing: [ids with no own rate] }
 * action "stamp": { assignment_id, manual_rate? } -> computes the assignment's cost
 *   once (manual rate, else own rate, else role default) and stores only the cost.
 */
const round2 = (n) => Math.round(n * 100) / 100;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json();
    const svc = base44.asServiceRole.entities;

    if (body.action === 'stamp') {
      const denied = await denyUnlessPermitted(base44, user, 'catering_edit');
      if (denied) return denied;
      const a = await svc.CateringAssignment.get(body.assignment_id);
      if (!a) return Response.json({ error: 'Assignment not found' }, { status: 404 });
      // Cost is frozen at confirmation — later rate changes never touch past assignments.
      if (Number(a.estimated_cost) > 0) return Response.json({ estimated_cost: a.estimated_cost });
      const manual = Number(body.manual_rate);
      let rate = Number.isFinite(manual) && manual > 0 ? manual : 0;
      if (!rate) {
        const [p] = await svc.EmployeePrivate.filter({ employee_record_id: a.employee_id });
        rate = Number(p?.hourly_rate) || 0;
      }
      if (!rate) {
        const roles = a.role_id ? [await svc.CateringStaffingRole.get(a.role_id).catch(() => null)]
          : await svc.CateringStaffingRole.filter({ name: a.role_name });
        rate = Number(roles[0]?.default_hourly_rate) || 0;
      }
      const estimated_cost = round2(rate * (Number(a.expected_hours) || 0));
      await svc.CateringAssignment.update(a.id, { estimated_cost });
      return Response.json({ estimated_cost });
    }

    const denied = await denyUnlessPermitted(base44, user, ['catering_edit', 'catering_view']);
    if (denied) return denied;
    const { employee_ids, hours } = body;
    if (!Array.isArray(employee_ids)) return Response.json({ error: 'employee_ids must be an array' }, { status: 400 });
    const h = Number(hours);
    if (!Number.isFinite(h) || h < 0) return Response.json({ error: 'hours must be a non-negative number' }, { status: 400 });

    const wanted = new Set(employee_ids.slice(0, 1000).map(String));
    const rows = await svc.EmployeePrivate.list('-created_date', 5000);
    const costs = {};
    for (const r of rows) {
      const rate = Number(r.hourly_rate) || 0;
      if (wanted.has(r.employee_record_id) && rate > 0) costs[r.employee_record_id] = round2(rate * h);
    }
    const missing = [...wanted].filter((id) => !(id in costs));
    const total = round2(Object.values(costs).reduce((s, c) => s + c, 0));
    return Response.json({ costs, total, missing });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}