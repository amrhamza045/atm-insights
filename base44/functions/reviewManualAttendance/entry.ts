import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { audit } from '../../shared/auditLog.js';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { isAutoApproveOn } from '../../shared/autoApproval.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from '../../shared/selfApprovalBypass.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, 'hr_attendance_approve');
    if (denied) return denied;

    const body = await req.json();
    const { attendanceId, decision, reason } = body;
    if (!attendanceId || !['confirm', 'reject'].includes(decision)) {
      return Response.json({ error: 'attendanceId and a valid decision are required' }, { status: 400 });
    }
    if (decision === 'reject' && !String(reason || '').trim()) {
      return Response.json({ error: 'A rejection reason is required' }, { status: 400 });
    }

    const attendance = await base44.asServiceRole.entities.Attendance.get(attendanceId).catch(() => null);
    if (!attendance) return Response.json({ error: 'Attendance request not found' }, { status: 404 });
    if (attendance.status !== 'pending_hr_confirmation') {
      return Response.json({ error: 'This request is no longer pending' }, { status: 409 });
    }
    const employee = await base44.asServiceRole.entities.Employee.get(attendance.employee_id).catch(() => null);
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });
    const autoSelf = body.auto === true && decision === 'approve' && await isAutoApproveOn(base44.asServiceRole);
    const ownRecord = !autoSelf && String(employee.email || '').toLowerCase() === String(user.email || '').toLowerCase();
    if (ownRecord && !await holdsSelfApprovalBypass(base44.asServiceRole, user)) {
      return Response.json({ error: 'You cannot confirm your own attendance' }, { status: 403 });
    }
    if (ownRecord && decision === 'confirm') {
      await auditSelfApproval(base44.asServiceRole, user, 'Attendance', attendance.id, `own manual check-in for ${attendance.date || 'today'}`);
    }

    const reviewedAt = new Date().toISOString();
    if (decision === 'confirm') {
      const updated = await base44.asServiceRole.entities.Attendance.update(attendance.id, {
        status: 'present',
        hr_confirmed_by: user.email,
        hr_confirmed_date: reviewedAt,
        hr_rejection_reason: '',
        hr_rejected_by: '',
        review_status: 'pending',
        admin_approved: false,
      });
      await audit(base44, user, 'approve', 'Attendance',
        `Confirmed manual check-in for ${employee.full_name || employee.email || employee.id}`,
        { entityId: attendance.id, entityName: employee.full_name });
      return Response.json({ attendance: updated });
    }

    const rejectionReason = String(reason).trim().slice(0, 1000);
    const updated = await base44.asServiceRole.entities.Attendance.update(attendance.id, {
      status: 'rejected_hr_confirmation',
      hr_rejection_reason: rejectionReason,
      hr_rejected_by: user.email,
      hr_rejected_date: reviewedAt,
      review_status: 'pending',
      admin_approved: false,
    });
    await base44.asServiceRole.entities.Notification.create({
      recipient_type: 'employee',
      employee_id: employee.id,
      title: 'Manual check-in request rejected',
      message: `HR rejected your manual check-in request: ${rejectionReason}`,
      type: 'system',
      entity_type: 'attendance',
      entity_id: attendance.id,
      read: false,
      icon: 'system',
    });
    await audit(base44, user, 'reject', 'Attendance',
      `Rejected manual check-in for ${employee.full_name || employee.email || employee.id}: ${rejectionReason}`,
      { entityId: attendance.id, entityName: employee.full_name });
    return Response.json({ attendance: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}