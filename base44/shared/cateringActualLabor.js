import { numberOrNull, roundMoney, sumAmounts, flag } from './cateringActualCostCommon.js';

/** Cost per hour frozen on the assignment at confirmation (no pay rate is stored). */
function assignmentCostPerHour(assignment) {
  const cost = numberOrNull(assignment?.estimated_cost), hours = numberOrNull(assignment?.expected_hours);
  return cost > 0 && hours > 0 ? roundMoney(cost / hours) : null;
}

export function actualLabor({ shifts, attendance, assignments, event }, warnings) {
  const rows = [];
  if (!shifts.length) flag(warnings, 'labor_no_shifts', event.id);
  if (!attendance.length) flag(warnings, 'labor_no_attendance', event.id);
  for (const shift of shifts) {
    const records = attendance.filter(a => a.shift_id === shift.id);
    if (!records.length && shift.status !== 'cancelled') flag(warnings, 'shift_attendance_missing', shift.id);
    const assignment = assignments.find(a => a.id === shift.catering_assignment_id) || assignments.find(a => a.shift_id === shift.id);
    const approved = records.filter(a => a.review_status !== 'rejected' && (a.review_status === 'approved' || a.admin_approved === true));
    const intervals = approved.filter(a => a.sign_in_time && a.sign_out_time).map(a => ({ id: a.id, start: Date.parse(a.sign_in_time), end: Date.parse(a.sign_out_time) }));
    const overlaps = intervals.some((a, i) => intervals.slice(i + 1).some(b => a.start < b.end && b.start < a.end));
    if (overlaps) flag(warnings, 'overlapping_attendance', shift.id, 'Ambiguous overlapping approved records excluded; correct duplicates before recomputing.');
    for (const record of records) {
      const row = { source_type: 'Attendance', source_id: record.id, source_updated_date: record.updated_date, shift_id: shift.id, assignment_id: assignment?.id || null, hours_worked: record.hours_worked, hourly_rate: assignmentCostPerHour(assignment), sign_in_time: record.sign_in_time, sign_out_time: record.sign_out_time, review_status: record.review_status, amount: 0, basis: 'assignment_hourly_rate' };
      let issue;
      const hours = numberOrNull(record.hours_worked), rate = assignmentCostPerHour(assignment);
      if (record.review_status === 'rejected' || ['absent', 'no_show', 'pending_hr_confirmation', 'rejected_hr_confirmation'].includes(record.status)) row.excluded = 'rejected_or_absent';
      else if (!approved.includes(record)) issue = 'attendance_not_approved';
      else if (!record.sign_out_time || !record.sign_in_time || !(Date.parse(record.sign_out_time) > Date.parse(record.sign_in_time)) || hours === null || hours < 0) issue = 'attendance_hours_incomplete';
      else if (overlaps) issue = 'overlapping_attendance';
      else if (record.employee_id !== shift.employee_id || assignment?.employee_id !== record.employee_id || assignment?.event_id !== event.id) issue = 'attendance_assignment_link_invalid';
      else if (!(rate > 0)) issue = 'assignment_hourly_rate_missing';
      else {
        row.amount = roundMoney(hours * rate);
        row.payroll_recorded_earnings = record.calculated_earnings ?? null;
        if (Math.abs((numberOrNull(record.calculated_earnings) ?? row.amount) - row.amount) > 0.01) row.payroll_difference = roundMoney(Number(record.calculated_earnings) - row.amount);
      }
      if (issue) { row.excluded = issue; flag(warnings, issue, record.id); }
      rows.push(row);
    }
  }
  for (const assignment of assignments.filter(a => a.status !== 'released')) {
    if (!shifts.some(s => s.id === assignment.shift_id)) flag(warnings, 'assignment_shift_missing', assignment.id);
  }
  return { total: sumAmounts(rows), rows };
}