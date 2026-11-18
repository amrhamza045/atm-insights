import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { hasHolds, requirementsChanged, resetHoldsIfRequirementsChanged } from "./quoteHoldReset";
import { getStockFlow } from "./requisition/requisitionFlow";
import { autoApproveReservation } from "./autoApproveReservation";

/**
 * After a duplicated revision is approved: when it needs different stock than the
 * revision it replaced, release the old holds and send the event back to the usual
 * reservation approval (auto-approved when that setting is on). Stock already
 * released to the kitchen is untouched, and an event whose requisition was already
 * sent keeps its holds — that change goes through the requisition instead.
 * Returns "unchanged" | "locked" | "queued" | "reserved".
 */
export async function resetHoldsAfterRevisionApproval({ eventId, previousQuoteId, quoteId }) {
  if (!eventId || !previousQuoteId || !quoteId) return "unchanged";
  const [event, oldQuote, newQuote, user] = await Promise.all([
    base44.entities.CateringEvent.get(eventId),
    base44.entities.CateringQuote.get(previousQuoteId),
    base44.entities.CateringQuote.get(quoteId),
    base44.auth.me(),
  ]);
  if (!requirementsChanged(oldQuote, newQuote) || !hasHolds(event)) return "unchanged";
  if ((await getStockFlow(event)).locked) return "locked";

  await resetHoldsIfRequirementsChanged({ event, oldQuote, newQuote, userEmail: user?.email });
  await base44.entities.CateringEvent.update(eventId, {
    reservation_status: "pending_approval",
    reservation_requested_by: user?.email || "",
    reservation_approved_by: "",
    reservation_approved_date: "",
  });
  return (await autoApproveReservation(eventId)) ? "reserved" : "queued";
}

const MESSAGES = {
  reserved: ["success", "Required items changed — the old stock holds were released and stock was reserved for the new revision."],
  queued: ["info", "Required items changed — the old stock holds were released. The new revision is waiting for reservation approval."],
  locked: ["warning", "This event's requisition was already sent, so its stock holds were kept. Update the requisition for the new revision."],
  failed: ["error", "The revision is active, but its stock holds couldn't be reset. Re-run reservations from Planning."],
};

/** Reset the holds after an approval, then tell the user what happened to them. */
export async function afterRevisionApproved(args) {
  const result = await resetHoldsAfterRevisionApproval(args).catch(() => "failed");
  const msg = MESSAGES[result];
  if (msg) toast[msg[0]](msg[1]);
  return result;
}