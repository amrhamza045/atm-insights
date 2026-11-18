import { base44 } from "@/api/base44Client";
import { reserveForEvent } from "./productionPlanning";
import { assertDepositCoversQuote } from "./cateringFinance";
import { logEventAudit } from "./eventAudit";

/**
 * Auto-approval for catering reservations: when the global switch is on and the
 * current user is the one whose action queued the reservation, run the normal
 * approve-and-reserve flow. The server still enforces the approval permission.
 * Returns the reservation result, or null when it stays pending.
 */
export async function autoApproveReservation(eventId, branch) {
  try {
    const [settings, user, event] = await Promise.all([
      base44.entities.SystemSettings.filter({ setting_key: "approval_settings" }),
      base44.auth.me(),
      base44.entities.CateringEvent.get(eventId),
    ]);
    if (settings[0]?.auto_approve_with_permission !== true) return null;
    if (event?.reservation_status !== "pending_approval" || !event.active_quote_id) return null;
    if (String(event.reservation_requested_by || "").toLowerCase() !== String(user?.email || "").toLowerCase()) return null;
    const quote = await base44.entities.CateringQuote.get(event.active_quote_id);
    await assertDepositCoversQuote({ eventId, quote });
    await base44.functions.invoke("reviewCateringReservation", { event_id: eventId, decision: "approve" });
    const res = await reserveForEvent({ event, quote, branch, userEmail: user.email });
    logEventAudit("approve", event, `Auto-approved reservation · ${res.rows.length} item(s), ${res.shortfalls.length} shortfall(s)`);
    return res;
  } catch {
    return null;
  }
}