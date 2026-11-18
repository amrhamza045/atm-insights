import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { loadPrivate } from '../_shared/employeePrivate.js';
import { compareFaces } from '../_shared/faceCompare.js';
import { getCompanyOffset, dayInOffset, TIMEZONE_MISSING } from '../_shared/companyTimezone.js';

/**
 * The only way staff clock themselves in/out. The caller is always the signed-in
 * user's own Employee record (matched by email); times are set by the server.
 * Actions: status | sign_in | sign_out | manual_sign_out
 */
const MANUAL = ['pending_hr_confirmation', 'rejected_hr_confirmation'];
const err = (error, status) => Response.json({ error }, { status });

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return err('Unauthorized', 401);
    const svc = base44.asServiceRole.entities;
    const body = await req.json();

    const employee = (await svc.Employee.filter({ email: user.email }))[0];
    if (!employee || ['inactive', 'terminated'].includes(employee.status)) return err('Active employee record not found', 403);
    if (employee.employment_type === 'system_account') return err('System accounts do not take attendance', 403);
    const priv = await loadPrivate(svc, employee.id);
    const hasFace = !!priv?.face_scan_data;
    if (body.action === 'status') return Response.json({ has_face: hasFace });

    const now = new Date();
    const tzOffset = await getCompanyOffset(svc);
    if (tzOffset === null) return err(TIMEZONE_MISSING, 409);
    const today = dayInOffset(now, tzOffset);
    const records = await svc.Attendance.filter({ employee_id: employee.id, attendance_date: today });
    const active = records.find((r) => r.sign_in_time && !r.sign_out_time && !MANUAL.includes(r.status));

    if (body.action === 'manual_sign_out') {
      if (!active) return err('No active confirmed sign-in is available to sign out.', 409);
      const hours = (now - new Date(active.sign_in_time)) / 3600000;
      if (!Number.isFinite(hours) || hours < 0) return err('The sign-in time is invalid. Please contact HR.', 409);
      const attendance = await svc.Attendance.update(active.id, {
        sign_out_time: now.toISOString(), hours_worked: Number(hours.toFixed(2)), sign_out_location_verified: false, status: 'completed',
      });
      return Response.json({ attendance });
    }

    if (!['sign_in', 'sign_out'].includes(body.action)) return err('Invalid action', 400);
    if (body.location_verified !== true) return err('Location not verified', 400);
    if (!hasFace) return err('No face photo registered. Please contact admin to register your face first.', 409);
    if (!String(body.image || '').startsWith('data:image/')) return err('A face photo is required', 400);
    const lat = Number(body.latitude), lng = Number(body.longitude);

    if (body.action === 'sign_in') {
      if (records.some((r) => r.status === 'pending_hr_confirmation')) return err('A request is already awaiting HR confirmation.', 409);
      if (active) return err('Already signed in', 409);
    } else if (!active) return err('Not signed in', 409);

    const face = await compareFaces(base44.asServiceRole.integrations, body.image, priv.face_scan_data);
    if (!face.match) return err(`Face match failed (${face.confidence}% confidence). Please try again.`, 403);

    if (body.action === 'sign_out') {
      const hours = (now - new Date(active.sign_in_time)) / 3600000;
      const attendance = await svc.Attendance.update(active.id, {
        sign_out_time: now.toISOString(), sign_out_location_verified: true,
        sign_out_latitude: Number.isFinite(lat) ? lat : undefined, sign_out_longitude: Number.isFinite(lng) ? lng : undefined,
        hours_worked: Number(hours.toFixed(2)), status: 'completed',
      });
      return Response.json({ attendance, confidence: face.confidence });
    }

    const shifts = await svc.Shift.filter({ employee_id: employee.id, shift_date: today });
    const shift = shifts[0] || null;
    let branchId = employee.branch_id || null, branchName = employee.branch_name || null;
    if (!branchId) {
      const branches = await svc.Branch.list();
      const def = branches.find((b) => b.is_default) || branches[0];
      branchId = def?.id || null; branchName = def?.name || null;
    }
    const attendance = await svc.Attendance.create({
      employee_id: employee.id, employee_name: employee.name, shift_id: shift?.id, attendance_date: today,
      sign_in_time: now.toISOString(), sign_in_location_verified: true,
      sign_in_latitude: Number.isFinite(lat) ? lat : undefined, sign_in_longitude: Number.isFinite(lng) ? lng : undefined,
      face_scan_verified: true, status: 'present', branch_id: branchId, branch_name: branchName,
    });
    return Response.json({ attendance, confidence: face.confidence });
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
