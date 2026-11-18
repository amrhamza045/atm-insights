import { releaseForEvent } from "./productionPlanning";
import { logEventAudit } from "./eventAudit";

// Required items = stock-planned lines (manually sourced lines never hold stock).
const signature = (quote) =>
  (quote?.line_items || [])
    .filter((l) => l.menu_item_id && !l.manually_sourced)
    .map((l) => `${l.menu_item_id}:${Number(l.quantity) || 0}`)
    .sort()
    .join("|");

const HELD = ["reserved", "shortfall", "pending_approval"];

/** True when two revisions need different stock (different required items or quantities). */
export const requirementsChanged = (oldQuote, newQuote) => signature(oldQuote) !== signature(newQuote);

/** True when the event currently holds stock or planned batches. */
export const hasHolds = (event) =>
  !!(event.inventory_reserved || HELD.includes(event.reservation_status) || event.production_plan_status === "planned");

/**
 * When the active quote's required items change, release every hold on the
 * event so reservations are rebuilt against the new package requirements.
 * Returns true when holds were released.
 */
export async function resetHoldsIfRequirementsChanged({ event, oldQuote, newQuote, userEmail }) {
  if (!requirementsChanged(oldQuote, newQuote) || !hasHolds(event)) return false;
  const reason = "Quote requirements changed — holds released for re-reservation";
  await releaseForEvent({ event, userEmail, reason });
  logEventAudit("update", event, reason);
  return true;
}