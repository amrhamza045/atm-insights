import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { openRequisitionAction, staleResponse, errorResponse } from '../../shared/requisitionAccess.js';
import { readAll } from '../../shared/cateringActualCostCommon.js';
import { costTotals } from '../../shared/requisitionPlannedLines.js';
import { appendRevision } from '../../shared/requisitionTrail.js';
import { extrasPosition, extraQty, appliedOf, RESTORE_FIELDS } from '../../shared/requisitionApproval.js';
import { notifyRequisition } from '../../shared/requisitionNotify.js';

/**
 * Approver decision on an over-limit requisition. Requires requisition_approve (assigned flags only) and the
 * requisition's branch; status pending_approval, approver's turn, and the revision the approver was looking at.
 *   approve → submitted, Inventory's turn. The current extras total (and uncosted extras) become the approved
 *             position: later checks ask again only when the extras rise above it or a new uncosted extra appears.
 *   reject  → reason required. The requisition and its lines go back exactly to the state before the action
 *             that triggered approval (a draft stays a draft, a counter returns to the chef's reply turn).
 * Body: { requisition_id, revision, decision: 'approve' | 'reject', comment? }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (!['approve', 'reject'].includes(body.decision)) return Response.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_approve');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor } = ctx;
    if (requisition.status !== 'pending_approval' || requisition.awaiting_side !== 'approver')
      return Response.json({ error: 'This requisition is not waiting for approval' }, { status: 409 });
    const stale = staleResponse(requisition, body.revision);
    if (stale) return stale;
    const comment = String(body.comment || '').trim().slice(0, 1000);
    if (body.decision === 'reject' && !comment) return Response.json({ error: 'A reason is required to reject' }, { status: 400 });

    const active = (await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id })).filter((l) => l.is_active !== false);
    const now = new Date().toISOString();
    const expect = { status: 'pending_approval', awaiting_side: 'approver', current_revision: Number(body.revision) };
    const qtyOf = (l) => Number(l.requested_quantity) || 0;
    const snap = (l, before, after, decision, reason) => ({
      line_id: l.id, inventory_item_name: l.inventory_item_name || '', line_type: l.line_type,
      quantity_before: before, quantity_after: after, decision, reason, comment: '',
    });

    if (body.decision === 'approve') {
      const isAdditional = requisition.is_additional === true || (Number(requisition.requisition_sequence) || 1) > 1;
      const { total, uncosted } = extrasPosition(active, isAdditional);
      const approvedLines = isAdditional ? active : active.filter((l) => l.line_type === 'extra');
      await appendRevision(svc, requisition, {
        side: 'approver', action: 'approved', ...actor, comment, ...appliedOf(requisition),
        line_snapshots: approvedLines.map((l) => snap(l, qtyOf(l), qtyOf(l), 'approved', '')),
      }, {
        status: 'submitted', awaiting_side: 'inventory', approval_status: 'approved', approved_by: actor.actor_name, approved_date: now,
        approved_extras_cost: total, approved_uncosted_extra_ids: uncosted.map((l) => l.id),
        approved_uncosted_quantities: uncosted.map((l) => ({ line_id: l.id, quantity: extraQty(l) })), approval_restore: null,
        last_action_by: actor.actor_name, last_action_date: now,
      }, expect);
      const notification = await notifyRequisition(svc, requisition, 'approved', actor);
      return Response.json({ requisition_id: requisition.id, status: 'submitted', awaiting_side: 'inventory', approved_extras_cost: total, notification });
    }

    const restore = requisition.approval_restore;
    if (!restore?.status || !Array.isArray(restore.lines))
      return Response.json({ error: 'No restore point was saved for this approval' }, { status: 409 });
    const saved = new Map(restore.lines.map((x) => [x.id, x]));
    const restored = active.map((l) => (saved.has(l.id) ? { ...l, ...saved.get(l.id) } : l));
    await appendRevision(svc, requisition, {
      side: 'approver', action: 'rejected', ...actor, comment, ...appliedOf(requisition),
      line_snapshots: restored.map((l, i) => snap(l, qtyOf(active[i]), qtyOf(l), l.inventory_decision || 'pending', 'Returned to the chef by the approver')),
    }, {
      status: restore.status, awaiting_side: restore.awaiting_side, counter_round: Number(restore.counter_round) || 0,
      submitted_at: restore.submitted_at || null, approval_status: 'rejected', rejection_reason: comment,
      rejected_by: actor.actor_name, rejected_date: now, approval_restore: null,
      last_action_by: actor.actor_name, last_action_date: now, ...costTotals(restored),
    }, expect);
    const writes = restore.lines.filter((x) => active.some((l) => l.id === x.id))
      .map((x) => ({ id: x.id, ...Object.fromEntries(Object.keys(RESTORE_FIELDS).map((k) => [k, x[k]])) }));
    if (writes.length) await svc.entities.RequisitionLine.bulkUpdate(writes);
    await svc.entities.Requisition.update(requisition.id, { last_action_date: new Date().toISOString() });
    const notification = await notifyRequisition(svc, requisition, 'rejected', actor, { reason: comment });
    return Response.json({ requisition_id: requisition.id, status: restore.status, awaiting_side: restore.awaiting_side, restored_lines: writes.length, notification });
  } catch (error) {
    return errorResponse(error);
  }
}