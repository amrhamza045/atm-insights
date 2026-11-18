import { readAll } from './cateringActualCostCommon.js';
import { snapshotOf, costTotals } from './requisitionPlannedLines.js';
import { appendRevision } from './requisitionTrail.js';
import { byAge } from './requisitionFlow.js';
import { voidUnreleasedBatches } from './requisitionBatches.js';
import { notifyRequisition } from './requisitionNotify.js';

/**
 * Cancel one requisition: every active line made inactive, plus a system "cancelled"
 * revision carrying a snapshot of each of those lines. Always pass a service-role client.
 * source: 'reservations_released' (reopened by the next planning run) | 'duplicate' | 'event_closeout' (never reopened).
 * Becomes 'stock_issued' (never reopened, planning refused) when at least one batch was already released.
 */
export async function cancelRequisition(svc, requisition, actor, { source, reason, comment }) {
  // Scheduled: its unreleased batch slips are voided (never deleted) and their reservations freed.
  // Released batches stay as they are; once stock was issued the requisition can never be reopened.
  const { voided, released } = await voidUnreleasedBatches(svc, requisition.id, actor.actor_name, `Requisition ${requisition.requisition_number} cancelled: ${reason}`);
  if (voided) comment = `${comment} ${voided} batch slip(s) voided.`;
  if (released.length) {
    source = 'stock_issued';
    comment = `${comment} ${released.length} released batch(es) kept — stock was already issued, so planning again is refused.`;
  }
  const lines = await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id });
  const active = lines.filter((l) => l.is_active !== false);
  if (active.length) await svc.entities.RequisitionLine.bulkUpdate(active.map((l) => ({ id: l.id, is_active: false })));
  const now = new Date().toISOString();
  await appendRevision(svc, requisition, {
    side: 'system', action: 'cancelled', ...actor, comment,
    line_snapshots: active.map((l) => snapshotOf(l, Number(l.requested_quantity), null, reason)),
  }, {
    status: 'cancelled', awaiting_side: 'none', cancelled_by: actor.actor_name, cancelled_date: now,
    cancel_reason: comment, cancel_source: source, last_action_by: actor.actor_name, last_action_date: now, ...costTotals([]),
    batch_proposal: null, batch_count: released.length,
    // Cancelled while waiting for approval: the approval request ends with it (the trail keeps it).
    ...(requisition.status === 'pending_approval' ? { approval_status: 'not_required', approval_restore: null } : {}),
  });
  return notifyRequisition(svc, requisition, 'cancelled', actor, { reason: comment });
}

/** Line fields a reopen resets: every decision and response cleared, no reservation held. */
export const RESET_LINE = { inventory_decision: 'pending', chef_response: 'none', agreed_quantity: null, decision_reason: '', is_agreed: false, reservation_id: null };

/**
 * Reopen side of a release cancel: the extra lines that were active when the requisition was
 * cancelled (its last "cancelled" revision) come back as pending lines with a clean slate.
 * Planned lines are rebuilt by the planner from the new reservations. Returns the reactivated lines.
 */
export async function reopenExtraLines(svc, requisition) {
  const [lastCancel] = await svc.entities.RequisitionRevision.filter({ requisition_id: requisition.id, action: 'cancelled' }, '-revision_number', 1);
  const ids = new Set((lastCancel?.line_snapshots || []).filter((s) => s.line_type === 'extra').map((s) => s.line_id));
  if (!ids.size) return [];
  const lines = (await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id })).filter((l) => ids.has(l.id) && l.is_active === false);
  if (lines.length) await svc.entities.RequisitionLine.bulkUpdate(lines.map((l) => ({ id: l.id, ...RESET_LINE, is_active: true })));
  return lines.map((l) => ({ ...l, ...RESET_LINE, is_active: true }));
}

/**
 * Duplicate guard for the primary requisition: keep the event's oldest active primary requisition
 * and cancel any duplicate primary draft with a system revision. Additional requisitions (is_additional: true)
 * are distinct sequences and are not cancelled as primary duplicates.
 */
export async function keepOldestActive(svc, eventId, actor) {
  const active = (await svc.entities.Requisition.filter({ event_id: eventId }))
    .filter((r) => r.status !== 'cancelled' && !r.is_additional && (Number(r.requisition_sequence) || 1) === 1)
    .sort(byAge);
  for (const duplicate of active.slice(1))
    await cancelRequisition(svc, duplicate, actor, {
      source: 'duplicate', reason: 'Duplicate requisition',
      comment: `Duplicate active primary requisition for this event — cancelled automatically; kept ${active[0].requisition_number} (the oldest)`,
    });
  return active[0] || null;
}