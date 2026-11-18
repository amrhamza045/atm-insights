import { base44 } from "@/api/base44Client";

/**
 * In-app staff notifications at event confirmation (v1).
 * Only assignments not yet notified are processed, so unchanged crew stay
 * quiet on re-confirms while a released-then-re-added staffer (a fresh
 * CateringAssignment row) is notified again. Delivery only reaches employees
 * with a matching app User login; unmatched staff are skipped but still
 * flagged as processed — WhatsApp is the planned channel for them, not an
 * in-app retry.
 */
export async function notifyAssignedStaff({ event }) {
  const assignments = await base44.entities.CateringAssignment.filter({
    event_id: event.id,
    status: "confirmed",
    assignment_notified: false,
  });
  if (assignments.length === 0) return { notified: 0, skipped: 0 };

  const employeeIds = [...new Set(assignments.map((a) => a.employee_id).filter(Boolean))];
  const employees = (
    await Promise.all(employeeIds.map((id) => base44.entities.Employee.get(id).catch(() => null)))
  ).filter(Boolean);
  const emailById = new Map(employees.map((e) => [e.id, (e.email || "").toLowerCase()]));

  const users = await base44.entities.User.list().catch(() => []);
  const userEmails = new Set(users.map((u) => (u.email || "").toLowerCase()).filter(Boolean));

  // One notification per employee, even if they fill multiple roles on the event
  const notifiedEmployeeIds = new Set();
  const rows = [];
  assignments.forEach((a) => {
    const email = emailById.get(a.employee_id);
    if (!email || !userEmails.has(email) || notifiedEmployeeIds.has(a.employee_id)) return;
    notifiedEmployeeIds.add(a.employee_id);
    rows.push({
      recipient_type: "employee",
      employee_id: a.employee_id,
      title: "You're assigned to a catering event",
      message: `${event.event_name} — ${event.event_type || "event"} on ${event.event_date}`,
      type: "catering_assignment",
      icon: "catering_assignment",
      entity_type: "catering_event",
      entity_id: event.id,
    });
  });

  if (rows.length) await base44.entities.Notification.bulkCreate(rows);

  // Flag every processed assignment, matched or not
  await base44.entities.CateringAssignment.bulkUpdate(
    assignments.map((a) => ({ id: a.id, assignment_notified: true }))
  );

  return { notified: rows.length, skipped: assignments.length - rows.length };
}