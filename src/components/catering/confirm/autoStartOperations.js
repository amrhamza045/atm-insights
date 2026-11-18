import { base44 } from "@/api/base44Client";
import { confirmAndStartOperations } from "./confirmOperations";

// Guards against two runs of the same event in this browser tab (approval + tab mount).
const running = new Map();

/**
 * Starts operations for a confirmed, fully-deposited event. Safe to call repeatedly:
 * it does nothing once the event is in progress, and the server re-checks deposit coverage.
 * Returns the operations result, or null when the event isn't ready.
 */
export function autoStartOperations(eventId) {
  if (running.has(eventId)) return running.get(eventId);
  const job = (async () => {
    const event = await base44.entities.CateringEvent.get(eventId);
    if (event?.status !== "confirmed" || event.deposit_status !== "paid") return null;
    const quote = event.active_quote_id
      ? await base44.entities.CateringQuote.get(event.active_quote_id).catch(() => null)
      : (await base44.entities.CateringQuote.filter({ event_id: eventId })).find((q) => ["active", "accepted"].includes(q.status));
    if (!quote) throw new Error("This event has no active quote to lock.");
    const userEmail = (await base44.auth.me())?.email;
    return confirmAndStartOperations({ event, quote, userEmail });
  })().finally(() => running.delete(eventId));
  running.set(eventId, job);
  return job;
}

export const OPERATIONS_QUERY_KEYS = ["catering-events", "kitchen-release-slips", "release-slip-reservations", "catering-reservations", "catering-production", "confirm-prior-result"];