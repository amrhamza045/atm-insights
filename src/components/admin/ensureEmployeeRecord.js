import { base44 } from "@/api/base44Client";

const NON_STAFF_ROLES = ["view_only", "user", ""];

// Whenever a user is given a staff role, make sure a matching Employee record
// exists — otherwise they never show up in the Employees list, HR, attendance
// or catering staffing pickers.
export async function ensureEmployeeRecord({ email, fullName, role }) {
  if (!email || NON_STAFF_ROLES.includes(role || "")) return null;

  const normalized = email.toLowerCase();
  const existing = await base44.entities.Employee.filter({ email: normalized });
  const record = existing[0] || (await base44.entities.Employee.filter({ email }))[0];

  if (record) {
    if (record.status === "terminated" || record.status === "inactive") {
      await base44.entities.Employee.update(record.id, { status: "active" });
    }
    return record;
  }

  return base44.entities.Employee.create({
    name: fullName || email,
    email: normalized,
    employee_id: `EMP-${Date.now().toString(36).toUpperCase()}`,
    position: "",
    salary_type: "hourly",
    status: "active",
    hire_date: new Date().toISOString().slice(0, 10),
  });
}