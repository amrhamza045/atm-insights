import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { openRequisitionAction, staleResponse, errorResponse } from '../../shared/requisitionAccess.js';
import { readAll, roundMoney } from '../../shared/cateringActualCostCommon.js';
import { costTotals } from '../../shared/requisitionPlannedLines.js';
import { appendRevision } from '../../shared/requisitionTrail.js';
import { isAgreed } from '../../shared/requisitionReply.js';
import { scheduleFirstBatch } from '../../shared/requisitionBatches.js';
import { approvalCheck, approvalRequestPatch, claimEventAllowanceOnConfirm, noApprovalPatch, restorePoint, revisionValues } from '../../shared/requisitionApproval.js';
import { notifyRequisition } from '../../shared/requisitionNotify.js';

const RESPONSES = ['accepted', 'countered'];

/**
 * Chef "Send response" after Inventory replied. Requires requisition_submit and the requisition's branch;
 * status replied, chef's turn, and the revision the user was looking at (stale → rejected, nothing changed).
 * Every open line Inventory edited or declined needs a response:
 *   accepted  → the line is agreed (edited keeps its agreed qty + reservation; declined stays declined, no reservation)
 *   countered → new qty > 0 + required comment: requested_quantity = counter, decision back to pending,
 *               chef_response countered. The reservation is left as is until Inventory decides again.
 * Extra lines the chef added this turn (saveRequisitionExtra) go to Inventory as pending lines.
 * All accepted and nothing added → confirmed (no one's turn). Anything countered or added → submitted,
 * Inventory's turn, counter_round + 1. There is NO round limit; counter_round is informational only.
 * Writes one revision ("accepted" or "countered") with per-line snapshots and comments.
 * Body: { requisition_id, revision, responses: [{ line_id, response, quantity?, comment? }], comment? }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_submit');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor } = ctx;
    if (requisition.status !== 'replied' || requisition.awaiting_side !== 'chef')
      return Response.json({ error: "Only a replied requisition waiting on the chef can be responded to" }, { status: 409 });
    const stale = staleResponse(requisition, body.revision);
    if (stale) return stale;

    const lines = await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id });
    const active = lines.filter((l) => l.is_active !== false);
    if (!active.length) return Response.json({ error: 'The requisition has no active lines left' }, { status: 409 });
    const needing = active.filter((l) => !isAgreed(l) && ['edited', 'declined'].includes(l.inventory_decision));
    const added = active.filter((l) => !isAgreed(l) && (l.inventory_decision || 'pending') === 'pending');
    const responses = new Map((body.responses || []).map((r) => [r.line_id, r]));

    const needIds = new Set(needing.map((l) => l.id));
    const problems = [...responses.keys()].filter((id) => !needIds.has(id)).map((id) => `Line ${id} is not waiting for a chef response`);
    for (const l of needing) {
      const r = responses.get(l.id);
      const name = l.inventory_item_name || l.id;
      if (!r || !RESPONSES.includes(r.response)) { problems.push(`${name}: accept or counter Inventory's decision`); continue; }
      if (r.response === 'countered') {
        const qty = Number(r.quantity);
        if (!(qty > 0)) problems.push(`${name}: the counter quantity must be above 0`);
        else if (l.inventory_decision === 'edited' && roundMoney(qty) === roundMoney(Number(l.agreed_quantity))) problems.push(`${name}: that is Inventory's quantity — use Accept`);
        if (!String(r.comment || '').trim()) problems.push(`${name}: a comment is required to counter`);
      }
    }
    if (problems.length) return Response.json({ error: 'The response is incomplete', code: 'invalid', problems }, { status: 400 });

    // Extra lines the chef removed during this turn: in Inventory's last reply, now inactive.
    const [lastReply] = await svc.entities.RequisitionRevision.filter({ requisition_id: requisition.id, revision_number: Number(requisition.current_revision) || 0 });
    const replied = new Set((lastReply?.line_snapshots || []).map((s) => s.line_id));
    const removed = lines.filter((l) => l.is_active === false && l.line_type === 'extra' && replied.has(l.id));

    const commentOf = (id) => String(responses.get(id)?.comment || '').trim().slice(0, 500);
    const responded = needing.map((l) => {
      const r = responses.get(l.id);
      return r.response === 'accepted'
        ? { ...l, chef_response: 'accepted', is_agreed: true, chef_comment: commentOf(l.id) || l.chef_comment || '', offered: l.agreed_quantity }
        : { ...l, chef_response: 'countered', is_agreed: false, requested_quantity: roundMoney(Number(r.quantity)), inventory_decision: 'pending',
            agreed_quantity: null, chef_comment: commentOf(l.id), offered: l.agreed_quantity };
    });
    const countered = responded.filter((l) => l.chef_response === 'countered');

    const byId = new Map(responded.map((l) => [l.id, l]));
    const merged = active.map((l) => byId.get(l.id) || l);

    // Extra-items limit on anything going back to Inventory. The round count is never part of it.
    // When everything is accepted (about to confirm), run the concurrency-safe allowance claim first so
    // two simultaneous additional requisitions cannot both consume the same remaining allowance.
    const backToInventory = countered.length > 0 || added.length > 0;
    const allowanceClaim = !backToInventory ? await claimEventAllowanceOnConfirm(svc, requisition, merged) : { fits: true, deduction: null };
    const check = backToInventory
      ? await approvalCheck(svc, requisition, merged)
      : !allowanceClaim.fits
      ? allowanceClaim.check
      : null;
    const needsApproval = check?.needsApproval === true;
    const nextRound = { counter_round: (Number(requisition.counter_round) || 0) + 1 };
    const routing = !backToInventory && !needsApproval
      ? { status: 'confirmed', awaiting_side: 'none' }
      : needsApproval
      ? { ...approvalRequestPatch(check, restorePoint(requisition, active)), ...(backToInventory ? nextRound : {}) }
      : { status: 'submitted', awaiting_side: 'inventory', ...nextRound, ...noApprovalPatch(requisition, check) };
    const now = new Date().toISOString();
    const snap = (l, before, after, decision, reason, comment) => ({
      line_id: l.id, inventory_item_name: l.inventory_item_name || '', line_type: l.line_type,
      quantity_before: before, quantity_after: after, decision, reason: reason || '', comment: comment || '',
    });
    await appendRevision(svc, requisition, {
      side: 'chef', action: needsApproval ? 'approval_requested' : backToInventory ? 'countered' : 'accepted', ...actor,
      comment: String(body.comment || '').trim().slice(0, 1000), ...(check ? revisionValues(check) : {}),
      line_snapshots: [
        ...responded.map((l) => l.chef_response === 'accepted'
          ? snap(l, l.offered ?? null, l.offered ?? null, 'accepted', l.decision_reason, commentOf(l.id))
          : snap(l, l.offered ?? null, l.requested_quantity, 'countered', l.decision_reason, l.chef_comment)),
        ...added.map((l) => snap(l, null, Number(l.requested_quantity) || 0, 'added', '', l.chef_comment)),
        ...removed.map((l) => snap(l, Number(l.requested_quantity) || 0, null, 'removed', 'Removed by the chef', '')),
      ],
    }, {
      ...routing, last_action_by: actor.actor_name, last_action_date: now, ...costTotals(merged),
    }, { status: 'replied', awaiting_side: 'chef', current_revision: Number(body.revision) });

    if (responded.length)
      await svc.entities.RequisitionLine.bulkUpdate(responded.map((l) => ({
        id: l.id,
        chef_response: l.chef_response,
        is_agreed: needsApproval ? false : l.is_agreed,
        chef_comment: l.chef_comment,
        ...(l.chef_response === 'countered' ? { requested_quantity: l.requested_quantity, inventory_decision: 'pending', agreed_quantity: null } : {}),
      })));
    await svc.entities.Requisition.update(requisition.id, { last_action_date: new Date().toISOString() });
    const allowanceDeduction = allowanceClaim.deduction;
    // Confirmed → batch 1 on the event date, status scheduled.
    const batches = routing.status === 'confirmed' ? await scheduleFirstBatch(svc, requisition.id, actor, ctx.user.email) : null;
    const notification = await notifyRequisition(svc, requisition, routing.status === 'confirmed' ? 'confirmed' : needsApproval ? 'approval_requested' : 'countered', actor, { reason: check?.reason });

    return Response.json({
      requisition_id: requisition.id, status: batches ? 'scheduled' : routing.status, batches, awaiting_side: routing.awaiting_side,
      counter_round: routing.counter_round ?? (Number(requisition.counter_round) || 0),
      accepted: responded.length - countered.length, countered: countered.length, added: added.length, removed: removed.length,
      routed_to_approval: needsApproval,
      approval_reason: check?.reason || '', ...(check?.applied || {}), allowance_deduction: allowanceDeduction, notification,
    });
  } catch (error) {
    return errorResponse(error);
  }
}