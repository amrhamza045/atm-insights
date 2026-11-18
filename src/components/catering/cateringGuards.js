/**
 * Segregation of duties for the money-moving catering actions.
 * Admins are exempt (single-operator reality today, same as PurchaseOrder).
 * Returns { allowed, reason } so callers can disable a button and explain why.
 */
const ALLOW = { allowed: true, reason: "" };

import isAdminUser from "@/components/permissions/isAdminUser";

/** Closing an event: needs catering_approve, and cannot be done by whoever prepared or priced it (unless they hold Self-approve). */
export function canFinalizeReconciliation({ permissions, currentUser, reconciliation, quote, selfBypass = false }) {
  if (isAdminUser(currentUser, permissions)) return ALLOW;
  if (!permissions?.catering_approve)
    return { allowed: false, reason: "You need catering approval rights to close an event." };
  const prepared = reconciliation?.created_by_id && currentUser?.id && reconciliation.created_by_id === currentUser.id;
  const priced = quote?.created_by_email && currentUser?.email && quote.created_by_email === currentUser.email;
  if ((prepared || priced) && selfBypass) return { allowed: true, reason: "", selfApproved: true };
  if (prepared)
    return { allowed: false, reason: "You prepared this reconciliation — another Catering Manager or an admin must approve and close it." };
  if (priced)
    return { allowed: false, reason: "You priced this event — another Catering Manager or an admin must approve and close it." };
  return ALLOW;
}

/**
 * Committing an event's stock: needs catering_approve. Staff record the deposit
 * (including a client transfer screenshot received over WhatsApp), but only a
 * Catering Manager/owner may release the reservation into real stock.
 */
export function canApproveReservation({ permissions, currentUser }) {
  if (isAdminUser(currentUser, permissions)) return ALLOW;
  if (!permissions?.catering_reservation_approve)
    return { allowed: false, reason: "Waiting for an approver to review this reservation in the Approval Center." };
  return ALLOW;
}

/** Credit notes: needs catering_finance, and cannot be issued by whoever priced the event. */
export function canIssueCreditNote({ permissions, currentUser, quote, selfBypass = false }) {
  if (isAdminUser(currentUser, permissions)) return ALLOW;
  if (!permissions?.catering_finance)
    return { allowed: false, reason: "You need catering finance rights to issue a credit note." };
  if (!selfBypass && quote?.created_by_email && currentUser?.email && quote.created_by_email === currentUser.email)
    return { allowed: false, reason: "You priced this event — a second Catering Manager or an admin must issue the credit note." };
  return ALLOW;
}