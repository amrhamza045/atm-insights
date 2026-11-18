import { sendAndLog } from "./emailDelivery.js";

export async function sendCustodyNotification({ svc, trip, assignment, title, message, emailsEnabled = true, employees = null }) {
  if (!assignment?.assigned_email) return false;
  const email = String(assignment.assigned_email).trim().toLowerCase();
  const staff = employees || await svc.entities.Employee.list("-created_date", 500);
  const employee = staff.find((row) => String(row.email || "").trim().toLowerCase() === email);

  if (employee) {
    await svc.entities.Notification.create({
      recipient_type: "employee",
      employee_id: employee.id,
      title,
      message,
      type: "catering_assignment",
      entity_type: "catering_trip",
      entity_id: trip.id,
      icon: "ShieldCheck",
    });
  }

  if (emailsEnabled) {
    await sendAndLog(svc, {
      key: "custody_emails_enabled",
      to: [email],
      subject: title,
      body: `<p>Hello ${assignment.assigned_name || ""},</p><p>${message}</p>`,
      context: trip.trip_label || trip.event_name || "",
      context_id: trip.id,
    });
  }
  return !!employee;
}