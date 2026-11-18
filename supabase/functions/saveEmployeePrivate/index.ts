import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { upsertPrivate } from '../_shared/employeePrivate.js';
import { audit } from '../_shared/auditLog.js';

const PRIVATE_LABELS = { hourly_rate: 'hourly rate', fixed_salary: 'fixed salary', face_scan_data: 'face photo', bonus_structure: 'bonus structure' };

/** HR-only: saves a staff member's face photo and pay fields (EmployeePrivate). */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'hr_edit');
    if (denied) return denied;

    const { employee_record_id, fields } = await req.json();
    if (!employee_record_id || !fields || typeof fields !== 'object') {
      return Response.json({ error: 'employee_record_id and fields are required' }, { status: 400 });
    }
    const svc = base44.asServiceRole.entities;
    const employee = await svc.Employee.get(employee_record_id);
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

    const clean = {};
    for (const k of ['hourly_rate', 'fixed_salary']) {
      if (fields[k] === null || fields[k] === '') clean[k] = null;
      else if (fields[k] !== undefined) {
        const n = Number(fields[k]);
        if (!Number.isFinite(n) || n < 0) return Response.json({ error: `${k} must be a non-negative number` }, { status: 400 });
        clean[k] = n;
      }
    }
    if (fields.face_scan_data !== undefined) clean.face_scan_data = String(fields.face_scan_data || '');
    if (fields.bonus_structure !== undefined) clean.bonus_structure = fields.bonus_structure;

    const saved = await upsertPrivate(svc, employee, clean);
    // Which details changed, never their values (pay and face photo stay private).
    const changed = Object.keys(clean);
    if (changed.length) await audit(base44, user, 'update', 'EmployeePrivate',
      `Updated ${changed.map((k) => PRIVATE_LABELS[k] || k).join(', ')} for ${employee.name}`,
      { entityId: employee.id, entityName: employee.name, changes: Object.fromEntries(changed.map((k) => [k, { changed: true }])) });
    return Response.json({ ok: true, id: saved.id });
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
