/**
 * Requisition flow gate (Requisition / Stock Permit Trail) — the ONE stock-flow decision.
 * Always pass an elevated (service-role) client.
 */
export const LOCKED_MESSAGE = "This event's requisition has already been sent to Inventory — replanning is locked";
export const ISSUED_MESSAGE = 'Stock has already been issued for this event.';
export const lockedMessage = (flow) => (flow.issued ? ISSUED_MESSAGE : LOCKED_MESSAGE);

/** Oldest first (created_date, then id) — the oldest active requisition is always the one kept. */
export const byAge = (a, b) =>
  String(a.created_date || '').localeCompare(String(b.created_date || '')) || String(a.id).localeCompare(String(b.id));

export const isPrimaryRequisition = (r) => !r.is_additional && (Number(r.requisition_sequence) || 1) === 1;

/**
 * Which stock flow an event is on, decided in this order:
 *   (a) a non-migrated KitchenReleaseSlip without a requisition_id → legacy, locked (rule 'legacy_slip') — retired-flow history
 *   (b) a non-cancelled primary Requisition exists        → requisition  (rule 'active_requisition') — never flips mid-process
 *   (b2) a requisition cancelled after stock was issued   → requisition, locked (rule 'stock_issued') — planning refused
 *   (c) otherwise                                         → requisition  (rule 'default') — the only flow
 * Additional requisitions (is_additional: true) exist after the primary requisition is confirmed and are tracked in `additional`.
 */
export async function getRequisitionFlow(svc, event) {
  const slips = await svc.entities.KitchenReleaseSlip.filter({ event_id: event.id });
  // Legacy slips already moved to requisitions (migrated_to_requisition) no longer hold the event on the retired flow.
  // Any other legacy slip is read-only history of the retired flow: stock was issued, so planning is refused.
  if (slips.some((slip) => !slip.requisition_id && slip.migrated_to_requisition !== true))
    return { mode: 'legacy', rule: 'legacy_slip', locked: true, issued: true };

  const all = (await svc.entities.Requisition.filter({ event_id: event.id })).sort(byAge);
  const active = all.filter((r) => r.status !== 'cancelled');
  const primaryActive = active.filter(isPrimaryRequisition);
  const additionalActive = active.filter((r) => !isPrimaryRequisition(r));

  if (primaryActive.length) {
    return {
      mode: 'requisition',
      rule: 'active_requisition',
      requisition: primaryActive[0],
      duplicates: primaryActive.slice(1),
      additional: additionalActive,
      total: all.length,
      locked: primaryActive[0].status !== 'draft' || additionalActive.length > 0,
    };
  }

  // Stock already issued for this event (a requisition cancelled after a batch was released): never reopened.
  if (all.some((r) => r.status === 'cancelled' && r.cancel_source === 'stock_issued'))
    return { mode: 'requisition', rule: 'stock_issued', requisition: null, additional: additionalActive, total: all.length, locked: true, issued: true };

  const cancelled = all.filter((r) => isPrimaryRequisition(r) && r.status === 'cancelled' && r.cancel_source === 'reservations_released')
    .sort((a, b) => String(b.cancelled_date || '').localeCompare(String(a.cancelled_date || '')))[0] || null;
  // Stock Release Slip Requisitions is the only flow for every event without a legacy slip.
  return { mode: 'requisition', rule: 'default', requisition: null, cancelled, additional: additionalActive, total: all.length, locked: false };
}