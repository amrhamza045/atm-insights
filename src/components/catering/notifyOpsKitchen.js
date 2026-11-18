import { base44 } from "@/api/base44Client";

const isTarget = (dept = "") =>
  ["operations", "kitchen"].some((name) => dept.toLowerCase().includes(name));

/** Resolve saved contacts, deduplicate recipients, and report actual send results. */
export async function notifyOpsKitchenOnPayment({ event, payment, notifyDeposit = false, notifyOperations = false }) {
  if (notifyDeposit) {
    const response = await base44.functions.invoke("notifyCateringDepositConfirmed", {
      event_id: event.id,
      payment_id: payment.id,
      notify_operations: notifyOperations,
    });
    return response.data;
  }

  const [staffResult] = await Promise.allSettled([
    base44.entities.Employee.list("name", 500),
  ]);
  const warnings = [];
  const emails = new Set();
  const add = (email) => { if (email?.trim()) emails.add(email.trim().toLowerCase()); };
  if (staffResult.status === "fulfilled") {
    staffResult.value.filter((e) => e.status === "active" && isTarget(e.department || "")).forEach((e) => add(e.email));
  } else warnings.push("Operations and Kitchen contacts could not be loaded");
  const money = (value) => `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
  const subject = `Event confirmed — ${event.event_name} on ${event.event_date}`;
  const text = [
    "A catering payment has been recorded for this confirmed event.",
    `Event: ${event.event_name || ""}`,
    `Date: ${event.event_date || ""} ${event.start_time || ""}`,
    `Client: ${event.client_name || ""}`,
    `Guests: ${event.guarantee_locked ? event.guaranteed_guests : event.expected_guests || 0}`,
    `Venue: ${event.location_type === "off_site" ? `${event.venue_name || ""} ${event.venue_address || ""}` : event.branch_name || "On site"}`,
    `Payment received: ${money(payment.amount)} (${(payment.payment_method || "").replace(/_/g, " ")})`,
    `Reference: ${payment.reference || "—"}`,
    `Total deposits received: ${money(event.deposit_paid_amount)}`,
    `Remaining event balance: ${money(event.balance_due)}`,
    "Stock release and preparation remain subject to the event's operational approvals.",
  ].join("\n");
  const results = await Promise.allSettled([...emails].map((to) =>
    base44.integrations.Core.SendEmail({ to, subject, text })
  ));
  return { sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length, warnings };
}