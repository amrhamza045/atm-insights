import { base44 } from "@/api/base44Client";

export const PRIVATE_FIELDS = ["face_scan_data", "hourly_rate", "fixed_salary", "bonus_structure", "current_month_earnings", "total_hours_worked"];

/**
 * Adds face photo + pay fields from EmployeePrivate onto Employee rows.
 * Only HR/admins can read EmployeePrivate — for anyone else the fields stay empty.
 */
export async function withEmployeePrivate(employees) {
  const rows = await base44.entities.EmployeePrivate.list("-created_date", 5000);
  const byId = Object.fromEntries(rows.map((r) => [r.employee_record_id, r]));
  return employees.map((e) => {
    const p = byId[e.id];
    if (!p) return e;
    const extra = {};
    for (const f of PRIVATE_FIELDS) if (p[f] !== undefined) extra[f] = p[f];
    return { ...e, ...extra };
  });
}

/** Splits a staff form payload into Employee fields and EmployeePrivate fields. */
export function splitPrivate(data) {
  const pub = { ...data };
  const priv = {};
  for (const f of PRIVATE_FIELDS) {
    if (f in pub) priv[f] = pub[f] ?? null;
    delete pub[f];
  }
  return { pub, priv };
}

export function saveEmployeePrivate(employeeRecordId, fields) {
  return base44.functions.invoke("saveEmployeePrivate", { employee_record_id: employeeRecordId, fields });
}