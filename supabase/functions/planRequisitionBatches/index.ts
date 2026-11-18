import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { openRequisitionAction, staleResponse, errorResponse } from '../_shared/requisitionAccess.js';
import { readAll } from '../_shared/cateringActualCostCommon.js';
import { appendRevision } from '../_shared/requisitionTrail.js';
import { getCompanyOffset, companyDay, TIMEZONE_MISSING } from '../_shared/companyTimezone.js';
import { plannableLines, planOfSlips, normalizePlan, planProblems, samePlan, releasedByLine, isReleased } from '../_shared/requisitionBatchPlan.js';
import { currentBatchSlips, scheduledOnly, applyBatchPlan } from '../_shared/requisitionBatches.js';
import { notifyRequisition } from '../_shared/requisitionNotify.js';

// Each side acts with its own requisition flag (Roles tab + per-user overrides only).
const SIDE_FLAG = { chef: 'requisition_submit', inventory: 'requisition_respond' };
const ACTIONS = ['propose', 'accept', 'decline', 'withdraw'];
const other = (side) => (side === 'chef' ? 'inventory' : 'chef');

/**
 * Batch plan proposals on a scheduled requisition (no stock moves). Released batches are locked: a plan
 * covers only the unreleased batches and each line's quantity left to release (agreed − released batches).
 * Body: { requisition_id, revision, side: 'chef' | 'inventory', action, batches?, comment?, reason? }
 *   propose  → batches = [{ slip_id?, needed_by_date, lines: [{ line_id, quantity }] }]. Validated server-side
 *              (per-line totals = agreed qty, no empty batch, dates today..event date). One open proposal:
 *              the other side's proposal is replaced ("propose different", turn passes back); your own must be withdrawn first.
 *   accept   → the other side's proposal, re-validated, is applied: batch slips created / updated / voided,
 *              one reservation per batch line, event rollup refreshed.
 *   decline  → the other side's proposal, reason required; the current plan stays.
 *   withdraw → your own side's proposal.
 * Every action: the side's flag, the requisition's branch, status scheduled and the revision on screen (stale → 409).
 * Each writes a split_* revision with the current and proposed plans.
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { side, action } = body;
    if (!SIDE_FLAG[side]) return Response.json({ error: "side must be 'chef' or 'inventory'" }, { status: 400 });
    if (!ACTIONS.includes(action)) return Response.json({ error: `action must be one of ${ACTIONS.join(', ')}` }, { status: 400 });
    const ctx = await openRequisitionAction(base44, body.requisition_id, SIDE_FLAG[side]);
    if (ctx.denied) return ctx.denied;
    const { svc, requisition, actor, user } = ctx;
    if (requisition.status !== 'scheduled')
      return Response.json({ error: 'Batch plans can only change on a scheduled requisition' }, { status: 409 });
    const stale = staleResponse(requisition, body.revision);
    if (stale) return stale;

    const open = requisition.batch_proposal?.batches?.length ? requisition.batch_proposal : null;
    // Released batches are locked: proposals only redistribute the unreleased quantities over unreleased batches.
    const allSlips = await currentBatchSlips(svc, requisition.id);
    const slips = scheduledOnly(allSlips);
    const releasedSlips = allSlips.filter(isReleased);
    const released = releasedByLine(allSlips);
    const lockedSlipIds = new Set(releasedSlips.map((s) => s.id));
    const slipsById = new Map(slips.map((s) => [s.id, s]));
    const current = planOfSlips(slips);
    const lines = plannableLines(await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id }));
    const linesById = new Map(lines.map((l) => [l.id, l]));
    const comment = String(body.comment || '').trim().slice(0, 1000);
    const now = new Date().toISOString();
    const expect = { status: 'scheduled', current_revision: Number(body.revision) };
    const header = { last_action_by: actor.actor_name, last_action_date: now };

    const validate = async (plan) => {
      const offset = await getCompanyOffset(svc.entities);
      if (offset === null) return [TIMEZONE_MISSING];
      const event = await svc.entities.CateringEvent.get(requisition.event_id).catch(() => null);
      return planProblems(plan, lines, slipsById, { today: companyDay(offset), eventDate: event?.event_date || requisition.event_date, released, lockedSlipIds });
    };

    if (action === 'propose') {
      if (open?.side === side) return Response.json({ error: 'Your side already has an open proposal — withdraw it first' }, { status: 409 });
      const plan = normalizePlan(body.batches, linesById, slipsById);
      const problems = await validate(plan);
      if (!problems.length && samePlan(plan, current)) problems.push('The proposed plan is the same as the current plan');
      if (problems.length) return Response.json({ error: 'The batch plan is not valid', code: 'invalid', problems }, { status: 400 });
      await appendRevision(svc, requisition, {
        side, action: 'split_proposed', ...actor, current_plan: current, proposed_plan: plan,
        comment: [open ? `Different plan proposed, replacing the ${open.side}'s proposal` : '', comment].filter(Boolean).join(' — '),
      }, {
        ...header, awaiting_side: other(side),
        batch_proposal: { side, batches: plan, proposed_by: actor.actor_name, proposed_by_id: actor.actor_user_id, proposed_at: now, comment },
      }, expect);
      const notification = await notifyRequisition(svc, requisition, 'split_proposed', actor, { side });
      return Response.json({ requisition_id: requisition.id, action, awaiting_side: other(side), replaced: open?.side || null, notification });
    }

    if (!open) return Response.json({ error: 'There is no open batch plan proposal' }, { status: 409 });
    if (action === 'withdraw') {
      if (open.side !== side) return Response.json({ error: 'Only the side that proposed this plan can withdraw it' }, { status: 409 });
      await appendRevision(svc, requisition, { side, action: 'split_withdrawn', ...actor, comment, current_plan: current, proposed_plan: open.batches },
        { ...header, awaiting_side: 'none', batch_proposal: null }, expect);
      const notification = await notifyRequisition(svc, requisition, 'split_withdrawn', actor, { side, proposerSide: open.side });
      return Response.json({ requisition_id: requisition.id, action, notification });
    }
    if (open.side === side) return Response.json({ error: 'The other side must answer this proposal' }, { status: 409 });

    if (action === 'decline') {
      const reason = String(body.reason || comment).trim().slice(0, 1000);
      if (!reason) return Response.json({ error: 'A reason is required to decline' }, { status: 400 });
      await appendRevision(svc, requisition, { side, action: 'split_declined', ...actor, comment: reason, current_plan: current, proposed_plan: open.batches },
        { ...header, awaiting_side: 'none', batch_proposal: null }, expect);
      const notification = await notifyRequisition(svc, requisition, 'split_declined', actor, { side, proposerSide: open.side, reason });
      return Response.json({ requisition_id: requisition.id, action, notification });
    }

    // accept: re-validated against today's lines, batches and dates.
    const plan = normalizePlan(open.batches, linesById, slipsById);
    const problems = await validate(plan);
    if (problems.length)
      return Response.json({ error: 'This proposal is no longer valid — decline it or propose a different plan', code: 'invalid', problems }, { status: 409 });
    await appendRevision(svc, requisition, { side, action: 'split_accepted', ...actor, comment, current_plan: current, proposed_plan: plan },
      { ...header, awaiting_side: 'none', batch_proposal: null, batch_count: releasedSlips.length + plan.length }, expect);
    const applied = await applyBatchPlan(svc, requisition, plan, user.email);
    await svc.entities.Requisition.update(requisition.id, { last_action_date: new Date().toISOString() });
    const notification = await notifyRequisition(svc, requisition, 'split_accepted', actor, { side, proposerSide: open.side });
    return Response.json({ requisition_id: requisition.id, action, batches: applied, notification });
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
