import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { openRequisitionAction, errorResponse } from '../../shared/requisitionAccess.js';
import { readAll } from '../../shared/cateringActualCostCommon.js';
import { costTotals, snapshotOf } from '../../shared/requisitionPlannedLines.js';
import { appendRevision } from '../../shared/requisitionTrail.js';
import { approvalCheck, approvalRequestPatch, restorePoint, revisionValues } from '../../shared/requisitionApproval.js';
import { notifyRequisition } from '../../shared/requisitionNotify.js';

/**
 * Chef "Request": DRAFT → SUBMITTED, Inventory's turn. Requires requisition_submit and the
 * requisition's branch; needs at least one active line. Writes a "submitted" revision.
 * The transition is guarded on status 'draft', so a requisition is submitted at most once;
 * once it leaves draft, replanning is locked (requisitionFlow).
 * Body: { requisition_id, comment? }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ctx = await openRequisitionAction(base44, body.requisition_id, 'requisition_submit');
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor, user } = ctx;
    if (requisition.status !== 'draft') return Response.json({ error: 'Only a draft requisition can be requested' }, { status: 409 });

    const lines = await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id });
    const active = lines.filter((l) => l.is_active !== false);
    if (!active.length) return Response.json({ error: 'Add at least one line before requesting' }, { status: 409 });

    // Extra-items limit: over it (or any uncosted extra) → Approvals instead of Inventory.
    const check = await approvalCheck(svc, requisition, active);
    const routing = check.needsApproval
      ? approvalRequestPatch(check, restorePoint(requisition, active))
      : { status: 'submitted', awaiting_side: 'inventory', approval_status: 'not_required', ...check.applied };

    const now = new Date().toISOString();
    const comment = String(body.comment || '').trim().slice(0, 1000);
    await appendRevision(svc, requisition, {
      side: 'chef', action: check.needsApproval ? 'approval_requested' : 'submitted', ...actor, comment, ...revisionValues(check),
      line_snapshots: active.map((l) => ({ ...snapshotOf(l, null, Number(l.requested_quantity) || 0, ''), comment: l.chef_comment || '' })),
    }, {
      ...routing, submitted_at: now, chef_user_id: user.id, chef_name: actor.actor_name,
      last_action_by: actor.actor_name, last_action_date: now, ...costTotals(lines),
    }, { status: 'draft' });
    const notification = await notifyRequisition(svc, requisition, check.needsApproval ? 'approval_requested' : 'submitted', actor, { reason: check.reason });

    return Response.json({ requisition_id: requisition.id, status: routing.status, awaiting_side: routing.awaiting_side, lines: active.length, approval_reason: check.reason, ...check.applied, notification });
  } catch (error) {
    return errorResponse(error);
  }
}