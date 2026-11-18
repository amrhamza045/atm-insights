import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { openRequisitionAction, staleResponse, errorResponse } from '../_shared/requisitionAccess.js';
import { readAll } from '../_shared/cateringActualCostCommon.js';
import { costTotals } from '../_shared/requisitionPlannedLines.js';
import { appendRevision } from '../_shared/requisitionTrail.js';
import { freeStockForLines } from '../_shared/requisitionStock.js';
import { loadConversionRules } from '../_shared/unitConversion.js';
import { scheduleFirstBatch } from '../_shared/requisitionBatches.js';
import { notifyRequisition } from '../_shared/requisitionNotify.js';
import {
  approvalRequestPatch,
  claimEventAllowanceOnConfirm,
  restorePoint,
  revisionValues,
} from '../_shared/requisitionApproval.js';
import {
  isAgreed, openLines, agreedOf, decisionProblems, stockProblems, applyLineReservation, refreshEventReservationRollup,
} from '../_shared/requisitionReply.js';

/**
 * Inventory "Send reply", any round: a Confirm / Edit / Decline decision on every OPEN line
 * (agreed lines are locked; open = countered lines, new extras, or all lines in round 1).
 * Requires requisition_respond and the requisition's branch; status submitted, Inventory's turn,
 * and the revision the user was looking at (stale → rejected, nothing changed).
 * Free stock is re-checked first — any shortage rejects the whole reply, nothing written.
 * Reservations: confirmed/edited → the line's reservation is set to the agreed qty (created when the
 * line holds none, e.g. an extra or a previously declined line) · declined → released.
 * Confirmed lines become agreed. Every active line agreed → confirmed; otherwise → replied (chef's turn).
 * Body: { requisition_id, revision, decisions: [{ line_id, decision, agreed_quantity?, reason? }], comment? }
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_respond');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor, user } = ctx;
    if (requisition.status !== 'submitted' || requisition.awaiting_side !== 'inventory')
      return Response.json({ error: 'Only a submitted requisition waiting on Inventory can be replied to' }, { status: 409 });
    const stale = staleResponse(requisition, body.revision);
    if (stale) return stale;

    const active = (await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id })).filter((l) => l.is_active !== false);
    const open = openLines(active);
    if (!open.length) return Response.json({ error: 'Every line is already agreed' }, { status: 409 });
    const decisions = new Map((body.decisions || []).map((d) => [d.line_id, d]));
    const problems = decisionProblems(open, decisions);
    if (problems.length) return Response.json({ error: 'The reply is incomplete', code: 'invalid', problems }, { status: 400 });

    const now = new Date().toISOString();
    const commentText = String(body.comment || '').trim().slice(0, 1000);
    const reasonOf = (l) => String(decisions.get(l.id).reason || '').trim().slice(0, 500);

    const openItemIds = [...new Set(open.map((l) => l.inventory_item_id).filter(Boolean))];
    const [heldList, unitRules, openItems] = await Promise.all([
      readAll(svc.entities.CateringReservation, { event_id: requisition.event_id, status: 'reserved' }),
      loadConversionRules(svc),
      openItemIds.length ? readAll(svc.entities.InventoryItem, { id: { $in: openItemIds } }) : [],
    ]);
    const held = new Map(heldList.map((r) => [r.id, r]));
    const itemById = new Map(openItems.map((i) => [i.id, i]));
    const free = await freeStockForLines(svc, open, unitRules);
    const short = stockProblems(open, decisions, free, itemById, unitRules);
    if (short.length) {
      // Save Inventory's draft decisions and comment without confirming or advancing the requisition,
      // so they do not have to re-enter them after raising a PO and receiving the stock.
      await svc.entities.RequisitionLine.bulkUpdate(open.map((l) => ({
        id: l.id,
        inventory_decision: decisions.get(l.id).decision,
        agreed_quantity: agreedOf(l, decisions.get(l.id)),
        decision_reason: reasonOf(l),
        is_agreed: false,
      })));
      await svc.entities.Requisition.update(requisition.id, {
        saved_reply_comment: commentText,
        last_action_date: now,
      });
      return Response.json({
        error: 'Some confirmed items exceed available free stock. Your decisions were saved — raise a draft PO for the missing items first, then send the reply once they are available.',
        code: 'stock_changed',
        saved_decisions: true,
        lines: short,
      }, { status: 409 });
    }

    const decided = open.map((l) => ({
      ...l, inventory_decision: decisions.get(l.id).decision, agreed_quantity: agreedOf(l, decisions.get(l.id)),
      decision_reason: reasonOf(l), is_agreed: decisions.get(l.id).decision === 'confirmed',
    }));
    const decidedById = new Map(decided.map((l) => [l.id, l]));
    const merged = active.map((l) => decidedById.get(l.id) || l);
    const allAgreed = merged.every(isAgreed);

    // Concurrency-safe allowance check & atomic reservation before confirming an additional requisition.
    // If another requisition for the same event consumed the remaining allowance in the meantime,
    // route this request to the Approval Center (requisition_approve) without deducting or scheduling.
    const allowanceClaim = allAgreed ? await claimEventAllowanceOnConfirm(svc, requisition, merged) : { fits: true, deduction: null };
    if (allAgreed && !allowanceClaim.fits) {
      const check = allowanceClaim.check;
      const restore = restorePoint(requisition, active);
      await appendRevision(svc, requisition, {
        side: 'inventory',
        action: 'approval_requested',
        ...actor,
        comment: commentText,
        ...revisionValues(check),
        line_snapshots: decided.map((l) => ({
          line_id: l.id, inventory_item_name: l.inventory_item_name || '', line_type: l.line_type,
          quantity_before: Number(l.requested_quantity) || 0, quantity_after: l.agreed_quantity, decision: l.inventory_decision, reason: l.decision_reason, comment: '',
        })),
      }, {
        ...approvalRequestPatch(check, restore),
        saved_reply_comment: commentText,
        last_action_by: actor.actor_name,
        last_action_date: now,
        ...costTotals(merged),
      }, { status: 'submitted', awaiting_side: 'inventory', current_revision: Number(body.revision) });

      // Save Inventory's draft decisions (unagreed / no reservation) so they remain visible in the Approval Center
      await svc.entities.RequisitionLine.bulkUpdate(decided.map((l) => ({
        id: l.id,
        inventory_decision: l.inventory_decision,
        agreed_quantity: l.agreed_quantity,
        decision_reason: l.decision_reason,
        is_agreed: false,
      })));
      await svc.entities.Requisition.update(requisition.id, { last_action_date: new Date().toISOString() });
      const notification = await notifyRequisition(svc, requisition, 'approval_requested', actor, { reason: check.reason });

      return Response.json({
        requisition_id: requisition.id,
        status: 'pending_approval',
        awaiting_side: 'approver',
        routed_to_approval: true,
        approval_reason: check.reason,
        ...check.applied,
        notification,
      });
    }

    await appendRevision(svc, requisition, {
      side: 'inventory', action: 'replied', ...actor, comment: commentText,
      line_snapshots: decided.map((l) => ({
        line_id: l.id, inventory_item_name: l.inventory_item_name || '', line_type: l.line_type,
        quantity_before: Number(l.requested_quantity) || 0, quantity_after: l.agreed_quantity, decision: l.inventory_decision, reason: l.decision_reason, comment: '',
      })),
    }, {
      status: allAgreed ? 'confirmed' : 'replied', awaiting_side: allAgreed ? 'none' : 'chef',
      saved_reply_comment: '',
      last_action_by: actor.actor_name, last_action_date: now, ...costTotals(merged),
    }, { status: 'submitted', awaiting_side: 'inventory', current_revision: Number(body.revision) });

    const reservationIds = new Map();
    for (const l of decided)
      reservationIds.set(l.id, await applyLineReservation(svc, requisition, l, held, free.get(l.inventory_item_id) ?? 0, user.email));
    await svc.entities.RequisitionLine.bulkUpdate(decided.map((l) => ({
      id: l.id, inventory_decision: l.inventory_decision, agreed_quantity: l.agreed_quantity, decision_reason: l.decision_reason,
      is_agreed: l.is_agreed, reservation_id: reservationIds.get(l.id),
    })));
    // Touch the header after the line writes so polling screens re-read the decided lines.
    await svc.entities.Requisition.update(requisition.id, { last_action_date: new Date().toISOString() });
    await refreshEventReservationRollup(svc, requisition.event_id);
    const allowanceDeduction = allowanceClaim.deduction;
    // Confirmed → batch 1 on the event date, status scheduled.
    const batches = allAgreed ? await scheduleFirstBatch(svc, requisition.id, actor, user.email) : null;
    const notification = await notifyRequisition(svc, requisition, allAgreed ? 'confirmed' : 'replied', actor);

    return Response.json({ requisition_id: requisition.id, status: batches ? 'scheduled' : allAgreed ? 'confirmed' : 'replied', decided: decided.length, batches, allowance_deduction: allowanceDeduction, notification });
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
