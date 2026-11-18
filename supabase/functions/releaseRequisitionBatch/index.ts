import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { openRequisitionAction, staleResponse, errorResponse } from '../_shared/requisitionAccess.js';
import { roundMoney } from '../_shared/cateringActualCostCommon.js';
import { appendRevision } from '../_shared/requisitionTrail.js';
import { audit } from '../_shared/auditLog.js';
import { planOfSlips } from '../_shared/requisitionBatchPlan.js';
import { currentBatchSlips, scheduledOnly, cancelOpenProposal } from '../_shared/requisitionBatches.js';
import { refreshEventReservationRollup } from '../_shared/requisitionReply.js';
import { notifyRequisition } from '../_shared/requisitionNotify.js';
import { loadConversionRules, toStockQuantity, getItemStockUnit } from '../_shared/unitConversion.js';
import { policyGate } from '../_shared/paymentPolicyEvent.js';
import { prepareCustodyInventory } from '../_shared/inventoryCustodyCapture.js';
import { movementRow, recordMovements } from '../_shared/inventoryMovements.js';

/**
 * Release one requisition batch (Inventory issues the stock), the same way the legacy slip fulfilment works.
 * Body: { requisition_id, revision, slip_id, lines: [{ reservation_id, actual_quantity }], comment? }
 * Needs requisition_release (Roles tab + per-user overrides only), the event's branch, the revision on screen,
 * a scheduled requisition and a scheduled batch. Per line 0 ≤ actual ≤ batch qty; per item the actuals ≤ on hand.
 * Then: stock deducted, the batch reservations consumed (actual < batch qty → variance, nothing left held),
 * the slip released with actual / variance quantities, a "batch_released" revision and the audit entry.
 * An open batch plan proposal is cancelled. The last batch → requisition fulfilled, event rollup released.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_release');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor, user, permissions } = ctx;
    const event = await svc.entities.CateringEvent.get(requisition.event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    // Payment policy: no stock leaves for an event on approval hold, not approved, or behind on a payment.
    const gate = await policyGate(svc, event);
    if (gate.blocked) return Response.json({ error: `Stock can't be released for this event: ${gate.blocked}` }, { status: 409 });
    if (requisition.status !== 'scheduled')
      return Response.json({ error: 'Batches can only be released on a scheduled requisition' }, { status: 409 });
    const stale = staleResponse(requisition, body.revision);
    if (stale) return stale;

    const slip = body.slip_id ? await svc.entities.KitchenReleaseSlip.get(body.slip_id).catch(() => null) : null;
    if (!slip || slip.requisition_id !== requisition.id || !slip.is_requisition_batch)
      return Response.json({ error: 'Batch not found on this requisition' }, { status: 404 });
    if (slip.status !== 'scheduled')
      return Response.json({ error: `Batch ${slip.batch_number} is ${slip.status} — only a scheduled batch can be released` }, { status: 409 });

    const unitRules = await loadConversionRules(svc);
    const input = new Map((Array.isArray(body.lines) ? body.lines : []).map((l) => [l?.reservation_id, Number(l?.actual_quantity)]));
    const moves = [];
    const need = new Map();
    const itemsById = new Map();
    for (const line of slip.lines || []) {
      const qty = Number(line.quantity_reserved) || 0;
      const actual = input.get(line.reservation_id);
      if (!Number.isFinite(actual) || actual < 0 || actual > qty)
        return Response.json({ error: `Actual quantity for ${line.inventory_item_name} must be between 0 and ${qty}` }, { status: 400 });
      const reservation = await svc.entities.CateringReservation.get(line.reservation_id).catch(() => null);
      if (reservation?.status !== 'reserved') return Response.json({ error: `${line.inventory_item_name} is no longer reserved` }, { status: 409 });
      let item = itemsById.get(line.inventory_item_id);
      if (!item) {
        item = await svc.entities.InventoryItem.get(line.inventory_item_id).catch(() => null);
        if (item) itemsById.set(line.inventory_item_id, item);
      }
      if (!item) return Response.json({ error: `${line.inventory_item_name} is missing from inventory` }, { status: 409 });
      const conv = toStockQuantity(actual, line.unit || reservation.unit || getItemStockUnit(item), item, unitRules);
      if (!conv.ok && actual > 0) {
        return Response.json({ error: `${line.inventory_item_name}: ${conv.message}` }, { status: 400 });
      }
      const actualInStock = conv.ok ? conv.quantity : roundMoney(actual);
      moves.push({ line, reservation, actual: roundMoney(actual), actualInStock, qty });
      need.set(line.inventory_item_id, roundMoney((need.get(line.inventory_item_id) || 0) + actualInStock));
    }
    for (const [itemId, total] of need) {
      const item = itemsById.get(itemId);
      const name = moves.find((m) => m.line.inventory_item_id === itemId)?.line;
      const onHand = Number(item.quantity) || 0;
      const sUnit = getItemStockUnit(item) || name?.unit || '';
      if (total > onHand + 1e-9) return Response.json({ error: `${name?.inventory_item_name} only has ${onHand} ${sUnit} on hand (needed ${total} ${sUnit})`.trim() }, { status: 409 });
    }

    const others = scheduledOnly(await currentBatchSlips(svc, requisition.id)).filter((s) => s.id !== slip.id);
    const last = others.length === 0;
    const open = requisition.batch_proposal?.batches?.length ? requisition.batch_proposal : null;
    const comment = String(body.comment || '').trim().slice(0, 1000);
    const now = new Date().toISOString();
    const accountingMovements=await prepareCustodyInventory(base44,user,{event,slip,moves,itemsById,rules:unitRules});
    // The revision claim is the single-winner step: a second release of the same view gets 409 before any stock moves.
    await appendRevision(svc, requisition, {
      side: 'inventory', action: 'batch_released', ...actor, current_plan: planOfSlips([slip]),
      comment: [`Batch ${slip.batch_number} (${slip.slip_number}) released: ${moves.length} line(s) issued from stock${last ? ' — last batch, requisition fulfilled' : ''}`, comment].filter(Boolean).join(' — '),
      line_snapshots: moves.map((m) => ({
        line_id: m.line.requisition_line_id || '', inventory_item_name: m.line.inventory_item_name || '', line_type: m.line.line_type || 'planned',
        quantity_before: m.qty, quantity_after: m.actual, decision: 'released',
        reason: m.actual < m.qty ? `Variance ${roundMoney(m.actual - m.qty)} ${m.line.unit || ''}: no longer held`.trim() : '', comment: '',
      })),
    }, { last_action_by: actor.actor_name, last_action_date: now, ...(last ? { status: 'fulfilled', awaiting_side: 'none' } : {}) },
    { status: 'scheduled', current_revision: Number(body.revision) });

    const movementRows = [];
    for (const m of moves) {
      if (m.actualInStock > 0) {
        const item = await svc.entities.InventoryItem.get(m.line.inventory_item_id);
        const after = Math.max(0, roundMoney((Number(item.quantity) || 0) - m.actualInStock));
        await svc.entities.InventoryItem.update(item.id, { quantity: after });
        movementRows.push(movementRow(item, {
          key: `catering_release:${slip.id}:${m.reservation.id}`, direction: 'out', type: 'catering_release', quantity: m.actualInStock,
          before: Number(item.quantity) || 0, after, source_entity: 'KitchenReleaseSlip', source_id: slip.id,
          source_label: `Release slip ${slip.slip_number || ''} · batch ${slip.batch_number || ''}`.trim(),
          event_id: event?.id, event_name: event?.event_name, actor_email: user.email,
        }, unitRules));
      }
      const isProdInput = (m.line.purpose || m.reservation.purpose) === 'production_input';
      await svc.entities.CateringReservation.update(m.reservation.id, {
        status: 'consumed', actual_quantity: m.actual,
        custody_quantity: isProdInput ? m.actual : 0,
        custody_consumed_quantity: Number(m.reservation.custody_consumed_quantity) || 0,
        consumed_by: user.email || '', consumed_date: now,
        release_reason: `Consumed through requisition batch ${slip.slip_number}`, at_risk: false,
      });
    }
    await svc.entities.KitchenReleaseSlip.update(slip.id, {
      status: 'released', fulfilled_by: user.email || '', fulfilled_date: now,
      lines: (slip.lines || []).map((l) => {
        const m = moves.find((x) => x.line.reservation_id === l.reservation_id);
        return { ...l, actual_quantity: m.actual, variance_quantity: roundMoney(m.actual - m.qty) };
      }),
    });
    for(const movement of accountingMovements)await svc.entities.InventoryAccountingMovement.update(movement.id,{status:'applied'});
    await recordMovements(svc.entities, movementRows);
    if (open) await cancelOpenProposal(svc, requisition.id, { ...actor }, `batch ${slip.batch_number} (${slip.slip_number}) was released`);
    if (last) await svc.entities.CateringEvent.update(event.id, { inventory_reserved: false, reservation_status: 'released', reservation_shortfall_count: 0 });
    else await refreshEventReservationRollup(svc, event.id);
    await audit(base44, user, 'approve', 'KitchenReleaseSlip',
      `Released requisition batch ${slip.slip_number} (${requisition.requisition_number}) · ${moves.filter((m) => m.actual > 0).length} item(s) issued from stock`,
      { entityId: slip.id, entityName: slip.event_name });
    const fresh = await svc.entities.Requisition.get(requisition.id);
    const notification = await notifyRequisition(svc, requisition, 'batch_released', actor, { batch: slip.batch_number, slip: slip.slip_number });
    return Response.json({
      requisition_id: requisition.id, slip_id: slip.id, slip_number: slip.slip_number, status: fresh.status,
      current_revision: Number(fresh.current_revision) || 0, proposal_cancelled: !!open, fulfilled: last, notification,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
