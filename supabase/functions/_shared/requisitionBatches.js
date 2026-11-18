import { readAll } from './cateringActualCostCommon.js';
import { releaseReservation, refreshEventReservationRollup } from './requisitionReply.js';
import { appendRevision } from './requisitionTrail.js';
import { plannableLines, planOfSlips } from './requisitionBatchPlan.js';

/**
 * Requisition release batches: one KitchenReleaseSlip per batch, linked by requisition_id and batch_number.
 * scheduled → released (stock issued, releaseRequisitionBatch) → received (chef receipt), or void.
 * Batch slips are written only by backend functions. Always pass a service-role client.
 */
export const BATCH_SCHEDULED = 'scheduled';

/** The requisition's batch slips in the current plan (every non-void one), by batch number. */
export async function currentBatchSlips(svc, requisitionId) {
  return (await readAll(svc.entities.KitchenReleaseSlip, { requisition_id: requisitionId }))
    .filter((s) => s.status !== 'void')
    .sort((a, b) => (Number(a.batch_number) || 0) - (Number(b.batch_number) || 0));
}

/** The batches not released yet (status scheduled): the only ones a plan, a void or a release can change. */
export const scheduledOnly = (slips) => slips.filter((s) => s.status === BATCH_SCHEDULED);

/**
 * Void the requisition's unreleased (scheduled) batches and put their reservations back to free stock.
 * Released batches and their consumed reservations are never touched. Returns { voided, released }.
 */
export async function voidUnreleasedBatches(svc, requisitionId, by, reason) {
  const slips = await currentBatchSlips(svc, requisitionId);
  const unreleased = scheduledOnly(slips);
  const ids = [...new Set(unreleased.flatMap((s) => (s.lines || []).map((l) => l.reservation_id)).filter(Boolean))];
  const held = ids.length ? await readAll(svc.entities.CateringReservation, { id: { $in: ids }, status: 'reserved' }) : [];
  for (const r of held) await releaseReservation(svc, r, by, reason);
  const voided = await voidBatchSlips(svc, unreleased, by, reason);
  return { voided, released: slips.filter((s) => s.status !== BATCH_SCHEDULED) };
}

/**
 * Cancel the requisition's open batch plan proposal (if any) with a system "split_cancelled" revision.
 * `why` completes "Open batch plan proposal from the <side> cancelled: …". Returns true when one was cancelled.
 */
export async function cancelOpenProposal(svc, requisitionId, actor, why) {
  const requisition = await svc.entities.Requisition.get(requisitionId);
  const open = requisition?.batch_proposal?.batches?.length ? requisition.batch_proposal : null;
  if (!open) return false;
  await appendRevision(svc, requisition, {
    side: 'system', action: 'split_cancelled', ...actor,
    comment: `Open batch plan proposal from the ${open.side} cancelled: ${why}`,
    current_plan: planOfSlips(scheduledOnly(await currentBatchSlips(svc, requisitionId))), proposed_plan: open.batches,
  }, { batch_proposal: null, awaiting_side: 'none' });
  return true;
}

/** Void batch slips (never deleted). */
export async function voidBatchSlips(svc, slips, by, reason) {
  const open = slips.filter((s) => s.status !== 'void');
  if (open.length)
    await svc.entities.KitchenReleaseSlip.bulkUpdate(open.map((s) => ({
      id: s.id, status: 'void', voided_by: by || '', voided_date: new Date().toISOString(), void_reason: reason,
    })));
  return open.length;
}

/** slip_number is unique across all slips (voided ones included): KRS-<req code>-B<n>, then -2, -3… */
async function uniqueSlipNumber(svc, base) {
  for (let k = 1; k < 100; k++) {
    const number = k === 1 ? base : `${base}-${k}`;
    const [taken] = await svc.entities.KitchenReleaseSlip.filter({ slip_number: number }, '-created_date', 1);
    if (!taken) return number;
  }
  throw new Error('Could not number the batch slip');
}

const STRIP = ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample'];
const copyOf = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !STRIP.includes(k)));

/**
 * Make the batch slips and reservations match a validated plan:
 *  - each batch line gets its own CateringReservation (quantity = batch qty, needed_by_date = batch date):
 *    the line's existing reservations are reused in order, extra ones created, leftovers released;
 *  - batches with a slip_id are updated, new batches get a new slip, dropped batches are voided (reason kept);
 *  - each line keeps its first batch's reservation as its reservation_id; the event's reservation rollup is refreshed.
 * Returns the applied plan (with slip ids and numbers).
 */
export async function applyBatchPlan(svc, requisition, plan, by) {
  // Released batches are locked: the plan only covers (and can only void) the unreleased ones.
  const allSlips = await currentBatchSlips(svc, requisition.id);
  const slips = scheduledOnly(allSlips);
  const slipsById = new Map(slips.map((s) => [s.id, s]));
  const lines = plannableLines(await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id }));
  const linesById = new Map(lines.map((l) => [l.id, l]));

  // Reservation pool per line: what the current batches hold, else the line's own reservation (batch 1).
  const poolIds = new Map();
  for (const s of slips) for (const x of s.lines || []) {
    if (!x.requisition_line_id || !x.reservation_id) continue;
    poolIds.set(x.requisition_line_id, [...(poolIds.get(x.requisition_line_id) || []), x.reservation_id]);
  }
  for (const l of lines) if (!poolIds.has(l.id) && l.reservation_id) poolIds.set(l.id, [l.reservation_id]);
  const allIds = [...new Set([...poolIds.values()].flat())];
  const held = new Map((allIds.length ? await readAll(svc.entities.CateringReservation, { id: { $in: allIds } }) : []).map((r) => [r.id, r]));
  const queues = new Map([...poolIds].map(([lineId, ids]) => [lineId, ids.map((id) => held.get(id)).filter((r) => r?.status === 'reserved')]));
  const templates = new Map([...queues].map(([lineId, q]) => [lineId, q[0]]));

  const reqNumber = requisition.requisition_number;
  const code = String(reqNumber || '').replace(/^REQ-/, '');
  let nextNumber = Math.max(0, ...allSlips.map((s) => Number(s.batch_number) || 0)) + 1;
  const used = new Set();
  const firstReservation = new Map();
  const applied = [];

  for (const b of plan) {
    const slipLines = [];
    for (const x of b.lines) {
      const line = linesById.get(x.line_id);
      let r = (queues.get(x.line_id) || []).shift();
      if (r) {
        if (Number(r.quantity_reserved) !== x.quantity || r.needed_by_date !== b.needed_by_date)
          await svc.entities.CateringReservation.update(r.id, {
            quantity_reserved: x.quantity, needed_by_date: b.needed_by_date, shortfall_quantity: Math.min(Number(r.shortfall_quantity) || 0, x.quantity),
          });
      } else {
        const t = templates.get(x.line_id);
        r = await svc.entities.CateringReservation.create({
          ...(t ? copyOf(t) : {
            branch_id: requisition.branch_id, branch_name: requisition.branch_name || '', event_id: requisition.event_id,
            event_name: requisition.event_name || '', event_date: requisition.event_date, quote_id: requisition.created_from_quote_id || '',
            inventory_item_id: line.inventory_item_id, inventory_item_name: line.inventory_item_name || '', unit: line.unit || '',
            purpose: line.purpose === 'production_input' ? 'production_input' : 'stock_pull',
            produced_item_name: line.produced_item_name || '', production_order_id: line.production_order_id || '', available_at_reservation: 0,
          }),
          quantity_reserved: x.quantity, needed_by_date: b.needed_by_date, shortfall_quantity: 0, status: 'reserved', reserved_by: by || '',
          notes: `Batch reservation on ${reqNumber}`,
        });
      }
      if (!firstReservation.has(x.line_id)) firstReservation.set(x.line_id, r.id);
      slipLines.push({
        reservation_id: r.id, inventory_item_id: line.inventory_item_id, inventory_item_name: line.inventory_item_name || '', unit: line.unit || '',
        purpose: line.purpose === 'production_input' ? 'production_input' : 'stock_pull', produced_item_name: line.produced_item_name || '',
        quantity_reserved: x.quantity, shortfall_quantity: 0, needed_by_date: b.needed_by_date, requisition_line_id: line.id, line_type: line.line_type,
      });
    }
    const existing = b.slip_id ? slipsById.get(b.slip_id) : null;
    let slip;
    if (existing) {
      used.add(existing.id);
      slip = await svc.entities.KitchenReleaseSlip.update(existing.id, { needed_by_date: b.needed_by_date, lines: slipLines, shortfall_count: 0 });
      slip = { ...existing, ...slip, needed_by_date: b.needed_by_date };
    } else {
      const batchNumber = nextNumber++;
      slip = await svc.entities.KitchenReleaseSlip.create({
        branch_id: requisition.branch_id, branch_name: requisition.branch_name || '', event_id: requisition.event_id,
        event_name: requisition.event_name || '', event_date: requisition.event_date, needed_by_date: b.needed_by_date,
        slip_number: await uniqueSlipNumber(svc, `KRS-${code}-B${batchNumber}`), status: BATCH_SCHEDULED, shortfall_count: 0,
        lines: slipLines, created_from_quote_id: requisition.created_from_quote_id || '',
        requisition_id: requisition.id, requisition_number: reqNumber, batch_number: batchNumber, is_requisition_batch: true,
      });
    }
    applied.push({ ...b, slip_id: slip.id, slip_number: slip.slip_number, batch_number: slip.batch_number });
  }

  for (const queue of queues.values())
    for (const r of queue) await releaseReservation(svc, r, by, `Merged into another batch by the batch plan on ${reqNumber}`);
  await voidBatchSlips(svc, slips.filter((s) => !used.has(s.id)), by, `Removed by the accepted batch plan on ${reqNumber}`);
  const relink = lines.filter((l) => firstReservation.has(l.id) && firstReservation.get(l.id) !== l.reservation_id);
  if (relink.length) await svc.entities.RequisitionLine.bulkUpdate(relink.map((l) => ({ id: l.id, reservation_id: firstReservation.get(l.id) })));
  await refreshEventReservationRollup(svc, requisition.event_id);
  return applied;
}

/**
 * Confirmed → scheduled (any confirm path): batch 1 on the event date with every agreed line (agreed qty > 0),
 * each linked to its reservation, plus a system "scheduled" revision. A no-op unless the requisition is
 * confirmed with no batch yet, or when every line was declined (nothing to release).
 */
export async function scheduleFirstBatch(svc, requisitionId, actor, by) {
  const requisition = await svc.entities.Requisition.get(requisitionId);
  if (requisition?.status !== 'confirmed') return null;
  if ((await currentBatchSlips(svc, requisition.id)).length) return null;
  const lines = plannableLines(await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id }));
  if (!lines.length) return null;
  const plan = [{
    batch_number: 1, slip_id: null, slip_number: '', needed_by_date: requisition.event_date,
    lines: lines.map((l) => ({ line_id: l.id, inventory_item_name: l.inventory_item_name || '', unit: l.unit || '', quantity: Number(l.agreed_quantity) })),
  }];
  const now = new Date().toISOString();
  await appendRevision(svc, requisition, {
    side: 'system', action: 'scheduled', ...actor,
    comment: `Batch 1 scheduled for the event date (${requisition.event_date}) with ${lines.length} agreed line(s)`,
    current_plan: [], proposed_plan: plan,
    line_snapshots: lines.map((l) => ({
      line_id: l.id, inventory_item_name: l.inventory_item_name || '', line_type: l.line_type,
      quantity_before: null, quantity_after: Number(l.agreed_quantity), decision: 'scheduled', reason: 'Batch 1', comment: '',
    })),
  }, { status: 'scheduled', awaiting_side: 'none', batch_count: 1, batch_proposal: null, last_action_by: actor.actor_name, last_action_date: now },
  { status: 'confirmed' });
  return applyBatchPlan(svc, requisition, plan, by);
}