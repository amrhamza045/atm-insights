/**
 * Ownership checks for customer-portal actions — the backend mirror of the
 * frontend cateringGuards module: a single place that decides whether the
 * calling user is allowed to act on a catering record.
 */

/** Returns { allowed, reason } for a portal customer acting on one quote. */
export function checkQuoteOwnership({ user, quote, event }) {
  const clientId = user?.portal_client_id;
  if (!clientId) return { allowed: false, reason: "Your account is not linked to a catering client." };
  if (!quote) return { allowed: false, reason: "Quote not found." };
  if (!event) return { allowed: false, reason: "The event for this quote no longer exists." };
  // The event's client is authoritative — a quote may carry a stale client_id
  // from an earlier edit, and that must not lock the real customer out.
  if (event.client_id !== clientId)
    return { allowed: false, reason: "This quote belongs to another client." };
  return { allowed: true, reason: "" };
}

/**
 * A deposit may be declared/paid against the live quote of an event that is
 * waiting for its deposit. A separate customer "accept" step is deliberately NOT
 * required: paying the deposit IS the commitment, and staff routinely log a
 * transfer the client sent over WhatsApp on their behalf.
 */
export function checkDepositDeclarable({ quote, event }) {
  if (quote.status === "superseded")
    return { allowed: false, reason: "This quote has been replaced by a newer revision." };
  if (quote.status === "rejected")
    return { allowed: false, reason: "This quote was rejected." };
  if (event.status === "deposit_pending_verification")
    return { allowed: false, reason: "We're already checking a transfer you told us about." };
  if (event.status !== "deposit_pending")
    return { allowed: false, reason: "This event isn't waiting for a deposit." };
  if ((event.required_deposit_amount || 0) <= 0)
    return { allowed: false, reason: "No deposit amount has been set for this event." };
  return { allowed: true, reason: "" };
}

/** A quote can only be decided once, and only while it is the live revision. */
export function checkQuoteDecidable({ quote, event }) {
  if (quote.status === "accepted" || quote.status === "rejected")
    return { allowed: false, reason: `This quote was already ${quote.status}.` };
  if (quote.status === "superseded")
    return { allowed: false, reason: "This quote has been replaced by a newer revision." };
  if (event.status === "cancelled")
    return { allowed: false, reason: "This event has been cancelled." };
  return { allowed: true, reason: "" };
}