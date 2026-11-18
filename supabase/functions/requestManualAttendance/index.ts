import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { isAutoApproveOn } from '../_shared/autoApproval.js';
import { audit } from '../_shared/auditLog.js';
import { getCompanyOffset, dayInOffset, TIMEZONE_MISSING } from '../_shared/companyTimezone.js';

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (body.action !== 'request') return Response.json({ error: 'Invalid manual attendance action' }, { status: 400 });
    const note = String(body.note || '').trim().slice(0, 1000);
    const hasLocation = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    const employee = employees[0];
    if (!employee || ['inactive', 'terminated'].includes(employee.status) || employee.employment_type === 'system_account') {
      return Response.json({ error: 'Active employee record not found' }, { status: 403 });
    }

    const now = new Date();
    const tzOffset = await getCompanyOffset(base44.asServiceRole.entities);
    if (tzOffset === null) return Response.json({ error: TIMEZONE_MISSING }, { status: 409 });
    const today = dayInOffset(now, tzOffset);
    const records = await base44.asServiceRole.entities.Attendance.filter({ employee_id: employee.id, attendance_date: today });
    if (records.some((record) => record.status === 'pending_hr_confirmation')) {
      return Response.json({ error: 'A manual check-in request is already awaiting HR confirmation' }, { status: 409 });
    }
    if (records.some((record) => record.sign_in_time && !record.sign_out_time && record.status !== 'rejected_hr_confirmation')) {
      return Response.json({ error: 'You are already signed in' }, { status: 409 });
    }

    const shifts = await base44.asServiceRole.entities.Shift.filter({ employee_id: employee.id, shift_date: today });
    const shift = shifts.find((item) => item.status !== 'cancelled') || shifts[0] || null;
    let branchId = employee.branch_id || shift?.branch_id || null;
    let branchName = employee.branch_name || shift?.branch_name || null;
    if (!branchId) {
      const branches = await base44.asServiceRole.entities.Branch.list();
      const branch = branches.find((item) => item.is_default) || branches[0];
      branchId = branch?.id || null;
      branchName = branch?.name || null;
    }

    const data = {
      employee_id: employee.id,
      employee_name: employee.name,
      shift_id: shift?.id,
      attendance_date: today,
      sign_in_time: now.toISOString(),
      sign_in_location_verified: false,
      face_scan_verified: false,
      manual_request_note: note,
      manual_location_captured: hasLocation,
      status: 'pending_hr_confirmation',
      review_status: 'pending',
      admin_approved: false,
      branch_id: branchId,
      branch_name: branchName,
      hr_confirmed_by: '',
      hr_rejection_reason: '',
      hr_rejected_by: '',
    };
    if (hasLocation) {
      data.sign_in_latitude = Number(body.latitude);
      data.sign_in_longitude = Number(body.longitude);
    }

    const rejected = records.find((record) => record.status === 'rejected_hr_confirmation');
    const attendance = rejected
      ? await base44.asServiceRole.entities.Attendance.update(rejected.id, data)
      : await base44.asServiceRole.entities.Attendance.create(data);
    await audit(base44, user, 'create', 'Attendance', `${employee.name} requested a manual check-in for ${today}${note ? `: ${note.slice(0, 200)}` : ''}`,
      { entityId: attendance.id, entityName: employee.name });
    // Auto-approval runs the normal HR review as the requester; any refusal leaves it pending.
    const auto = await isAutoApproveOn(base44.asServiceRole) && await base44.functions.invoke('reviewManualAttendance', { attendanceId: attendance.id, decision: 'approve', auto: true }).catch(() => null);
    if (auto?.data && !auto.data.error) return Response.json({ attendance, auto_approved: true });
    return Response.json({ attendance });
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
