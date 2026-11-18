/**
 * Server-side access to EmployeePrivate (face photo + pay fields moved off Employee).
 * Always pass an elevated (service-role) entities client.
 */
export const PRIVATE_FIELDS = ['face_scan_data', 'hourly_rate', 'fixed_salary', 'bonus_structure',
  'current_month_earnings', 'total_hours_worked'];

export async function loadPrivate(svc, employeeRecordId) {
  const rows = await svc.EmployeePrivate.filter({ employee_record_id: employeeRecordId });
  return rows[0] || null;
}

export async function upsertPrivate(svc, employee, fields) {
  const data = { employee_record_id: employee.id, employee_code: employee.employee_id };
  for (const f of PRIVATE_FIELDS) if (fields[f] !== undefined) data[f] = fields[f];
  const existing = await loadPrivate(svc, employee.id);
  return existing ? svc.EmployeePrivate.update(existing.id, data) : svc.EmployeePrivate.create(data);
}