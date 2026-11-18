import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { openRequisitionAction, errorResponse } from '../../shared/requisitionAccess.js';
import { readAll, roundMoney } from '../../shared/cateringActualCostCommon.js';
import { lineCosting, costTotals } from '../../shared/requisitionPlannedLines.js';
import { stockUnit } from '../../shared/requisitionStock.js';
import { loadConversionRules, toStockQuantity, convertQuantity } from '../../shared/unitConversion.js';
import { isAgreed, releaseReservation, refreshEventReservationRollup } from '../../shared/requisitionReply.js';

/**
 * Chef side: add, edit or remove an EXTRA line (planned lines are read-only).
 * Requires requisition_submit and the requisition's branch. Allowed on a draft, and during the chef's
 * turn (replied, awaiting chef): there the chef may add new extras, edit extras added this turn, and
 * remove any extra that isn't agreed yet (its reservation, if inventory had created one, is released).
 * Agreed lines are locked. Body: { requisition_id, action: 'add' | 'update' | 'remove', line_id?, inventory_item_id?, quantity?, note? }
 * Removing deactivates the line (lines are never deleted). Cost follows lineCosting.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_submit');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, user } = ctx;
    const chefTurn = requisition.status === 'replied' && requisition.awaiting_side === 'chef';
    if (requisition.status !== 'draft' && !chefTurn)
      return Response.json({ error: "Extra lines can only be changed on a draft or during the chef's turn" }, { status: 409 });
    if (!['add', 'update', 'remove'].includes(body.action)) return Response.json({ error: 'Unknown action' }, { status: 400 });

    const lines = await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id });
    const line = body.action === 'add' ? null : lines.find((l) => l.id === body.line_id);
    const isPlannedDraftEdit = body.action === 'update' && requisition.status === 'draft' && line?.line_type === 'planned';
    if (body.action !== 'add' && (!line || (!isPlannedDraftEdit && line.line_type !== 'extra') || line.is_active === false))
      return Response.json({ error: 'Line not found on this requisition' }, { status: 404 });
    if (line && isAgreed(line)) return Response.json({ error: 'Agreed lines are locked' }, { status: 409 });
    if (chefTurn && body.action === 'update' && (line.inventory_decision || 'pending') !== 'pending')
      return Response.json({ error: "Only extra lines added this turn can be edited — respond to Inventory's decision instead" }, { status: 409 });

    if (body.action === 'remove') {
      await svc.entities.RequisitionLine.update(line.id, { is_active: false, ...(line.reservation_id ? { reservation_id: null } : {}) });
      if (line.reservation_id) {
        const held = await svc.entities.CateringReservation.get(line.reservation_id).catch(() => null);
        await releaseReservation(svc, held, user.email, `Extra line removed by the chef on ${requisition.requisition_number}`);
        await refreshEventReservationRollup(svc, requisition.event_id);
      }
    } else if (isPlannedDraftEdit) {
      const quantity = roundMoney(Number(body.quantity));
      if (!(quantity > 0)) return Response.json({ error: 'The quantity must be above 0' }, { status: 400 });
      const note = body.note !== undefined ? String(body.note || '').trim().slice(0, 500) : (line.chef_comment || '');
      await svc.entities.RequisitionLine.update(line.id, { requested_quantity: quantity, chef_comment: note });
      if (line.reservation_id) {
        const held = await svc.entities.CateringReservation.get(line.reservation_id).catch(() => null);
        if (held && held.status === 'reserved') {
          const [item, unitRules, otherReservations] = await Promise.all([
            svc.entities.InventoryItem.get(line.inventory_item_id).catch(() => null),
            loadConversionRules(svc),
            readAll(svc.entities.CateringReservation, { inventory_item_id: line.inventory_item_id, status: 'reserved', id: { $ne: held.id } }),
          ]);
          const itemStockUnit = stockUnit(item);
          const committedInStock = otherReservations.reduce((sum, r) => {
            const raw = Number(r.quantity_reserved) || 0;
            const conv = toStockQuantity(raw, r.unit || itemStockUnit, item, unitRules);
            return sum + (conv.ok ? conv.quantity : raw);
          }, 0);
          const freeInStock = Math.max(0, roundMoney((Number(item?.quantity) || 0) - committedInStock));
          const freeInLineUnitConv = convertQuantity(freeInStock, itemStockUnit, line.unit || itemStockUnit, { item, itemId: item?.id, rules: unitRules });
          const freeBefore = freeInLineUnitConv.ok ? roundMoney(freeInLineUnitConv.quantity) : freeInStock;
          const shortfall = Math.max(0, roundMoney(quantity - Math.max(0, freeBefore)));
          await svc.entities.CateringReservation.update(held.id, {
            quantity_reserved: quantity,
            available_at_reservation: Math.max(0, freeBefore),
            shortfall_quantity: shortfall,
          });
          await refreshEventReservationRollup(svc, requisition.event_id);
        }
      }
    } else {
      const quantity = roundMoney(Number(body.quantity));
      if (!(quantity > 0)) return Response.json({ error: 'The quantity must be above 0' }, { status: 400 });
      const [item, unitRules] = await Promise.all([
        body.inventory_item_id ? svc.entities.InventoryItem.get(body.inventory_item_id).catch(() => null) : null,
        loadConversionRules(svc),
      ]);
      if (!item || item.branch_id !== requisition.branch_id)
        return Response.json({ error: "Pick an inventory item from this event's branch" }, { status: 400 });
      const unit = String(body.unit || stockUnit(item)).trim();
      const fields = {
        inventory_item_id: item.id, inventory_item_name: item.name || '', unit, requested_quantity: quantity,
        chef_comment: String(body.note || '').trim().slice(0, 500), ...lineCosting(item, unit, { zeroIsUncosted: true, rules: unitRules }),
      };
      if (line) await svc.entities.RequisitionLine.update(line.id, fields);
      else await svc.entities.RequisitionLine.create({
        ...fields, requisition_id: requisition.id, event_id: requisition.event_id, branch_id: requisition.branch_id,
        line_type: 'extra', purpose: 'extra_request', reservation_id: null, needed_by_date: requisition.event_date || undefined,
        inventory_decision: 'pending', chef_response: 'none', is_agreed: false, is_active: true,
        sort_order: lines.reduce((max, l) => Math.max(max, Number(l.sort_order) || 0), 0) + 1,
      });
    }

    const totals = costTotals(await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id }));
    await svc.entities.Requisition.update(requisition.id, totals);
    return Response.json({ ok: true, ...totals });
  } catch (error) {
    return errorResponse(error);
  }
}