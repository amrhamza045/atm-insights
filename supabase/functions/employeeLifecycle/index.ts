import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { loadPrivate, upsertPrivate } from '../_shared/employeePrivate.js';
import { audit } from '../_shared/auditLog.js';

const bad = (error, status = 400) => Response.json({ error }, { status });
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const text = (v, max = 4000) => String(v || '').trim().slice(0, max);

/** Salary revisions and performance appraisals: propose (hr_edit) → independent decision (hr_attendance_approve). */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json();
    const { action } = body;
    const svc = base44.asServiceRole.entities;
    const proposing = ['proposeSalaryRevision', 'createAppraisal'].includes(action);
    const deciding = ['decideSalaryRevision', 'decideAppraisal'].includes(action);
    if (!proposing && !deciding) return bad('Unknown action');

    const denied = await denyUnlessPermitted(base44, user, proposing ? 'hr_edit' : 'hr_attendance_approve');
    if (denied) return denied;
    const now = new Date().toISOString();

    if (proposing) {
      const { employee_record_id } = body;
      if (!employee_record_id) return bad('employee_record_id is required');
      // User-scoped read: enforces the caller's branch/HR visibility on this employee.
      const employee = await base44.entities.Employee.get(employee_record_id).catch(() => null);
      if (!employee) return bad('Employee not found', 404);
      const base = {
        employee_record_id: employee.id, employee_name: employee.name, branch_id: employee.branch_id || '',
        status: 'pending', proposed_by: user.email, proposed_by_id: user.id, proposed_at: now,
      };

      if (action === 'proposeSalaryRevision') {
        const hourly = num(body.new_hourly_rate), fixed = num(body.new_fixed_salary);
        if (Number.isNaN(hourly) || Number.isNaN(fixed)) return bad('Pay amounts must be non-negative numbers');
        if (hourly === null && fixed === null) return bad('Enter a new hourly rate or fixed salary');
        if (!body.effective_date) return bad('Effective date is required');
        if (!text(body.reason)) return bad('A reason is required');
        const priv = await loadPrivate(svc, employee.id);
        const pending = await svc.SalaryRevision.filter({ employee_record_id: employee.id, status: 'pending' });
        if (pending.length) return bad('This employee already has a pending salary revision', 409);
        const rec = await svc.SalaryRevision.create({
          ...base, effective_date: body.effective_date, reason: text(body.reason),
          prior_hourly_rate: priv?.hourly_rate ?? null, prior_fixed_salary: priv?.fixed_salary ?? null,
          new_hourly_rate: hourly, new_fixed_salary: fixed,
        });
        await audit(base44, user, 'create', 'SalaryRevision', `Proposed salary revision for ${employee.name}`, { entityId: rec.id, entityName: employee.name });
        return Response.json({ ok: true, id: rec.id });
      }

      const rating = Number(body.rating);
      if (!body.period_start || !body.period_end || body.period_end < body.period_start) return bad('A valid review period is required');
      if (!(rating >= 1 && rating <= 5)) return bad('Rating must be between 1 and 5');
      if (!text(body.assessment)) return bad('An assessment is required');
      const rec = await svc.PerformanceAppraisal.create({
        ...base, period_start: body.period_start, period_end: body.period_end, rating,
        assessment: text(body.assessment), goals: text(body.goals), notes: text(body.notes),
      });
      await audit(base44, user, 'create', 'PerformanceAppraisal', `Created appraisal for ${employee.name}`, { entityId: rec.id, entityName: employee.name });
      return Response.json({ ok: true, id: rec.id });
    }

    // Decisions
    const { id, decision } = body;
    if (!id || !['approve', 'reject'].includes(decision)) return bad('id and a valid decision are required');
    if (decision === 'reject' && !text(body.note)) return bad('A reason is required to reject');
    const entity = action === 'decideSalaryRevision' ? svc.SalaryRevision : svc.PerformanceAppraisal;
    const rec = await entity.get(id).catch(() => null);
    if (!rec) return bad('Record not found', 404);
    if (rec.status !== 'pending') return bad('This item is no longer pending', 409);
    if (rec.proposed_by_id === user.id) return bad('You cannot decide a request you proposed', 403);
    const employee = await base44.entities.Employee.get(rec.employee_record_id).catch(() => null);
    if (!employee) return bad('Employee not found or outside your access', 404);
    if (String(employee.email || '').toLowerCase() === String(user.email || '').toLowerCase()) {
      return bad('You cannot decide a request about yourself', 403);
    }

    const decided: Record<string, unknown> = { decided_by: user.email, decided_by_id: user.id, decided_at: now, decision_note: text(body.note, 1000) };
    if (action === 'decideSalaryRevision' && decision === 'approve') {
      const priv = await loadPrivate(svc, employee.id);
      const fields: Record<string, unknown> = {};
      if (rec.new_hourly_rate !== null && rec.new_hourly_rate !== undefined) fields.hourly_rate = rec.new_hourly_rate;
      if (rec.new_fixed_salary !== null && rec.new_fixed_salary !== undefined) fields.fixed_salary = rec.new_fixed_salary;
      await upsertPrivate(svc, employee, fields);
      decided.prior_hourly_rate = priv?.hourly_rate ?? null;
      decided.prior_fixed_salary = priv?.fixed_salary ?? null;
    }
    const updated = await entity.update(rec.id, { ...decided, status: decision === 'approve' ? 'approved' : 'rejected' });
    await audit(base44, user, decision === 'approve' ? 'approve' : 'reject',
      action === 'decideSalaryRevision' ? 'SalaryRevision' : 'PerformanceAppraisal',
      `${decision === 'approve' ? 'Approved' : 'Rejected'} ${action === 'decideSalaryRevision' ? 'salary revision' : 'appraisal'} for ${employee.name}`,
      { entityId: rec.id, entityName: employee.name });
    return Response.json({ ok: true, record: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
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
