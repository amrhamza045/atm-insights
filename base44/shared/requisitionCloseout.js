import { readAll } from './cateringActualCostCommon.js';
import { appendRevision } from './requisitionTrail.js';
import { cancelRequisition } from './requisitionLifecycle.js';
import { currentBatchSlips, scheduledOnly, voidUnreleasedBatches, cancelOpenProposal } from './requisitionBatches.js';

/**
 * Requisition side of event closeout ("close out stock" and "finalize reconciliation"). Always pass a service-role client.
 *  - pending_approval / submitted / replied → 409 closeout_blocked;
 *  - unreleased (scheduled) batches → 409 unreleased_batches with the batches listed, unless the caller chose
 *    resolution "close_anyway" (a reason and the flag that gates that closeout screen are required): the unreleased
 *    batches are voided, their reservations freed, an open proposal cancelled, a system revision written with the reason;
 *  - released-but-not-received batches don't block: a "not received at closeout" history entry, once per batch;
 *  - a draft is cancelled (never reopened); anything else is kept. Consumed reservations are never touched.
 * Nothing is written before every refusal check has passed. Returns { status, body }.
 */
export const CLOSEOUT_BLOCKS = ['pending_approval', 'submitted', 'replied'];
const BLOCKED_MESSAGE = "Finish or cancel this event's requisition before closing it.";
const UNRELEASED_MESSAGE = "This event has batches that haven't been released yet.";
/** Close anyway needs the flag that already gates the closeout screen it was started from. */
export const CLOSE_ANYWAY_FLAG = { stock: 'catering_edit', finalize: 'catering_approve' };

const result = (status, body) => ({ status, body });
const batchView = (r, s) => ({
  slip_id: s.id, slip_number: s.slip_number, batch_number: s.batch_number, needed_by_date: s.needed_by_date,
  requisition_id: r.id, requisition_number: r.requisition_number, current_revision: Number(r.current_revision) || 0,
  lines: (s.lines || []).map((l) => ({
    reservation_id: l.reservation_id, inventory_item_id: l.inventory_item_id, inventory_item_name: l.inventory_item_name || '',
    unit: l.unit || '', quantity_reserved: Number(l.quantity_reserved) || 0,
  })),
});

export async function closeoutRequisitions(svc, event, permissions, actor, { resolution, reason, context } = {}) {
  const all = await svc.entities.Requisition.filter({ event_id: event.id });
  const active = all.filter((r) => r.status !== 'cancelled');
  if (active.some((r) => CLOSEOUT_BLOCKS.includes(r.status))) return result(409, { error: BLOCKED_MESSAGE, code: 'closeout_blocked' });

  const pending = [];
  for (const r of active.filter((x) => x.status === 'scheduled')) {
    const unreleased = scheduledOnly(await currentBatchSlips(svc, r.id));
    if (unreleased.length) pending.push({ requisition: r, unreleased });
  }
  if (pending.length && resolution !== 'close_anyway')
    return result(409, { error: UNRELEASED_MESSAGE, code: 'unreleased_batches', batches: pending.flatMap(({ requisition, unreleased }) => unreleased.map((s) => batchView(requisition, s))) });

  const why = String(reason || '').trim().slice(0, 500);
  if (pending.length) {
    const flag = CLOSE_ANYWAY_FLAG[context];
    if (!flag) return result(400, { error: "context must be 'stock' or 'finalize'" });
    if (permissions[flag] !== true) return result(403, { error: `Forbidden: closing anyway requires the ${flag} permission` });
    if (!why) return result(400, { error: 'A reason is required to close anyway' });
  }

  const voided = [];
  for (const { requisition, unreleased } of pending) {
    await cancelOpenProposal(svc, requisition.id, actor, 'the event was closed out');
    const numbers = unreleased.map((s) => s.slip_number).join(', ');
    const voidReason = `Closed anyway at event closeout: ${why}`;
    const released = (await currentBatchSlips(svc, requisition.id)).filter((s) => s.status !== 'scheduled');
    if (released.length) {
      await voidUnreleasedBatches(svc, requisition.id, actor.actor_name, voidReason);
      await appendRevision(svc, requisition, {
        side: 'system', action: 'batches_voided', ...actor,
        comment: `Event closeout — closed anyway: ${unreleased.length} unreleased batch(es) voided (${numbers}), their reservations returned to free stock. Reason: ${why}`,
      }, { status: 'fulfilled', awaiting_side: 'none', batch_proposal: null, batch_count: released.length, last_action_by: actor.actor_name, last_action_date: new Date().toISOString() });
    } else {
      await cancelRequisition(svc, await svc.entities.Requisition.get(requisition.id), actor, {
        source: 'event_closeout', reason: voidReason,
        comment: `Event closeout — closed anyway: no batch was released, ${unreleased.length} unreleased batch(es) (${numbers}) voided and their reservations returned to free stock. Reason: ${why}`,
      });
    }
    voided.push(...unreleased.map((s) => s.slip_number));
  }

  // Released but never confirmed received: recorded once in the history, never blocks.
  const notReceived = (await readAll(svc.entities.KitchenReleaseSlip, { event_id: event.id, status: 'released' }))
    .filter((s) => s.is_requisition_batch && s.requisition_id && !s.not_received_at_closeout);
  for (const s of notReceived) {
    const requisition = all.find((r) => r.id === s.requisition_id) || await svc.entities.Requisition.get(s.requisition_id);
    await appendRevision(svc, requisition, {
      side: 'system', action: 'closeout_note', ...actor,
      comment: `Batch ${s.batch_number} (${s.slip_number}) was released but not received at closeout`,
    });
    await svc.entities.KitchenReleaseSlip.update(s.id, { not_received_at_closeout: true });
  }

  const drafts = active.filter((r) => r.status === 'draft');
  for (const draft of drafts)
    await cancelRequisition(svc, draft, actor, {
      source: 'event_closeout', reason: 'Event closeout',
      comment: 'Cancelled at event closeout: this draft was never sent to Inventory.',
    });
  return result(200, {
    cancelled: drafts.map((r) => r.requisition_number), kept: active.filter((r) => r.status !== 'draft').map((r) => r.requisition_number),
    voided, not_received: notReceived.map((s) => s.slip_number),
  });
}