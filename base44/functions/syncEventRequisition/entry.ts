import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getAssignedPermissions } from '../../shared/resolveEffectivePermissions.js';
import { readAll } from '../../shared/cateringActualCostCommon.js';
import { getRequisitionFlow, lockedMessage } from '../../shared/requisitionFlow.js';
import { closeoutRequisitions } from '../../shared/requisitionCloseout.js';
import { planLineSync, duplicatePlannedLines, costTotals, snapshotOf, lineCosting } from '../../shared/requisitionPlannedLines.js';
import { loadConversionRules } from '../../shared/unitConversion.js';
import { appendRevision } from '../../shared/requisitionTrail.js';
import { cancelRequisition, keepOldestActive, reopenExtraLines } from '../../shared/requisitionLifecycle.js';
import { refreshEventRequisitionBaseline, computeEventBaselineComparison } from '../../shared/requisitionBaseline.js';
import { getEventAllowanceState } from '../../shared/requisitionApproval.js';
import { stockUnit } from '../../shared/requisitionStock.js';

// Permissions of the planning paths that reserve or release stock: Planning tab, reservation approval,
// Confirm & Start, event cancellation, quote changes, closeout.
const PLANNING_FLAGS = ['catering_edit', 'catering_reservation_approve', 'catering_approve', 'catering_finance'];
// Requisition states a release of the event's reservations cancels (any path: Planning release, event
// cancellation, quote hold reset). Planning the event again reopens the same requisition as a clean draft.
// A scheduled requisition's unreleased batch slips are voided with it; released ones are kept and the
// requisition is then never reopened (cancel_source 'stock_issued').
const RELEASE_CANCELS = ['draft', 'pending_approval', 'submitted', 'replied', 'confirmed', 'scheduled'];
const PURPOSE_ORDER = { stock_pull: 0, production_input: 1 };
const byPlanOrder = (a, b) => (PURPOSE_ORDER[a.purpose] ?? 2) - (PURPOSE_ORDER[b.purpose] ?? 2)
  || String(a.inventory_item_name || '').localeCompare(String(b.inventory_item_name || ''))
  || String(a.id).localeCompare(String(b.id));

/**
 * Requisition side of event planning (Phase 1). Body: { event_id, phase, reason? }.
 *  phase "check":  which stock flow the event is on (legacy | requisition), the rule that decided it,
 *                  and whether replanning is locked. Any active staff account; reveals nothing else.
 *  phase "sync":   mirror the event's reserved reservations into its draft requisition — created on the
 *                  first plan, or the one the last release cancelled reopened as draft. Duplicate active
 *                  requisitions are cancelled (the oldest is kept). Costs recomputed, system revision appended.
 *  phase "cancel": once the event holds no reserved stock, cancel its draft / submitted / replied / confirmed
 *                  requisition(s). The next "sync" reopens it as a clean draft (extras kept as pending).
 *  phase "closeout": event closeout (body: resolution?, reason?, context: 'stock' | 'finalize') — see
 *                  shared/requisitionCloseout.js: blocks, unreleased batches (hold / release / close anyway),
 *                  not-received notes, drafts cancelled.
 * Every phase gates on assigned flags only; sync/cancel/closeout need a planning flag and the event's branch.
 */
export default async function(req) {
  let body = {};
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    body = await req.json();
    const { event_id, phase = 'check' } = body;
    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!['check', 'sync', 'cancel', 'closeout', 'refresh_baseline', 'event_summary', 'create_additional'].includes(phase))
      return Response.json({ error: `Unknown phase: ${phase}` }, { status: 400 });
    // Assigned flags only (Roles tab + per-user overrides): admin status grants nothing here.
    const permissions = await getAssignedPermissions(base44, user);
    if (!permissions || permissions.access_denied)
      return Response.json({ error: 'Forbidden: no active staff permissions' }, { status: 403 });

    const svc = base44.asServiceRole;
    const event = await svc.entities.CateringEvent.get(event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (phase === 'check') {
      const flow = await getRequisitionFlow(svc, event);
      return Response.json({ flow: flow.mode, rule: flow.rule, locked: flow.locked, message: flow.locked ? lockedMessage(flow) : '' });
    }

    if (phase === 'refresh_baseline') {
      if (permissions.branch_id && permissions.branch_id !== event.branch_id)
        return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
      const items = await refreshEventRequisitionBaseline(svc, event);
      return Response.json({ ok: true, baseline_items: items });
    }

    if (phase === 'event_summary') {
      if (permissions.requisition_view !== true && permissions.requisition_submit !== true && permissions.requisition_respond !== true && permissions.requisition_approve !== true)
        return Response.json({ error: 'Forbidden: requires requisition access' }, { status: 403 });
      if (permissions.branch_id && permissions.branch_id !== event.branch_id)
        return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
      const [allReqs, allowanceState] = await Promise.all([
        svc.entities.Requisition.filter({ event_id: event.id }),
        getEventAllowanceState(svc, event.id),
      ]);
      const nonCancelled = allReqs.filter((r) => r.status !== 'cancelled');
      const primary = nonCancelled.find((r) => !r.is_additional && (Number(r.requisition_sequence) || 1) === 1) || null;
      const hasConfirmedPrimary = !!primary && ['confirmed', 'scheduled', 'fulfilled'].includes(primary.status);
      const openAdditional = nonCancelled.find(
        (r) => r.is_additional && ['draft', 'pending_approval', 'submitted', 'replied'].includes(r.status)
      ) || null;
      const baseline = await computeEventBaselineComparison(svc, event, { requisitions: allReqs });
      return Response.json({
        event_id: event.id,
        quoteRevision: baseline.quoteRevision,
        baselineItems: baseline.baselineItems,
        shortfalls: baseline.shortfalls,
        allowanceConfigured: allowanceState.configured,
        allowanceUsed: allowanceState.used,
        allowanceRemaining: allowanceState.remaining,
        hasConfirmedPrimary,
        hasOpenAdditional: !!openAdditional,
        openAdditionalId: openAdditional?.id || null,
        openAdditionalNumber: openAdditional?.requisition_number || '',
      });
    }

    if (phase === 'create_additional') {
      if (permissions.requisition_submit !== true)
        return Response.json({ error: 'Forbidden: requires the requisition_submit permission' }, { status: 403 });
      if (permissions.branch_id && permissions.branch_id !== event.branch_id)
        return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
      const actor = { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: permissions.role || '' };
      const allReqs = await svc.entities.Requisition.filter({ event_id: event.id });
      const nonCancelled = allReqs.filter((r) => r.status !== 'cancelled');
      const primary = nonCancelled.find((r) => !r.is_additional && (Number(r.requisition_sequence) || 1) === 1);
      if (!primary || !['confirmed', 'scheduled', 'fulfilled'].includes(primary.status)) {
        return Response.json({
          error: 'An additional requisition can only be created after the first requisition for this event is confirmed.',
          code: 'primary_not_confirmed',
        }, { status: 409 });
      }
      const existingOpen = nonCancelled.find(
        (r) => r.is_additional && ['draft', 'pending_approval', 'submitted', 'replied'].includes(r.status)
      );
      if (existingOpen) {
        return Response.json({
          requisition_id: existingOpen.id,
          requisition_number: existingOpen.requisition_number,
          already_open: true,
        });
      }

      const maxSeq = Math.max(1, ...allReqs.map((r) => Number(r.requisition_sequence) || 1));
      const nextSeq = maxSeq + 1;
      const code = event.event_code || event.id.slice(-6).toUpperCase();
      let reqNumber = `REQ-${code}-${nextSeq}`;
      for (let k = nextSeq; k < nextSeq + 50; k++) {
        const candidate = `REQ-${code}-${k}`;
        if (!allReqs.some((r) => r.requisition_number === candidate)) {
          reqNumber = candidate;
          break;
        }
      }

      const allowanceState = await getEventAllowanceState(svc, event.id);
      const now = new Date().toISOString();
      const created = await svc.entities.Requisition.create({
        branch_id: event.branch_id,
        branch_name: event.branch_name || '',
        event_id: event.id,
        event_name: event.event_name || '',
        event_date: event.event_date,
        requisition_number: reqNumber,
        requisition_sequence: nextSeq,
        is_additional: true,
        allowance_configured_at_check: allowanceState.configured,
        allowance_remaining_before: allowanceState.remaining,
        created_from_quote_id: event.active_quote_id || '',
        status: 'draft',
        awaiting_side: 'chef',
        approval_status: 'not_required',
        current_revision: 0,
        counter_round: 0,
        chef_user_id: user.id,
        chef_name: actor.actor_name,
        last_action_by: actor.actor_name,
        last_action_date: now,
      });

      const createdLines = [];
      if (body.prefill_shortfalls === true) {
        const baseline = await computeEventBaselineComparison(svc, event, { requisitions: allReqs });
        const shortfalls = baseline.shortfalls.filter((s) => s.uncovered_shortfall_quantity > 0);
        if (shortfalls.length) {
          const itemIds = [...new Set(shortfalls.map((s) => s.inventory_item_id).filter(Boolean))];
          const [items, unitRules] = await Promise.all([
            itemIds.length ? readAll(svc.entities.InventoryItem, { id: { $in: itemIds } }) : [],
            loadConversionRules(svc),
          ]);
          const itemById = new Map(items.map((i) => [i.id, i]));
          const payloads = shortfalls.map((s, idx) => {
            const item = itemById.get(s.inventory_item_id);
            const unit = s.unit || stockUnit(item) || '';
            return {
              requisition_id: created.id,
              event_id: event.id,
              branch_id: event.branch_id,
              line_type: 'extra',
              purpose: s.purpose === 'production_input' ? 'production_input' : 'stock_pull',
              produced_item_name: s.produced_item_name || '',
              inventory_item_id: s.inventory_item_id,
              inventory_item_name: s.inventory_item_name || item?.name || '',
              unit,
              system_minimum_quantity: s.minimum_quantity,
              requested_quantity: s.uncovered_shortfall_quantity,
              needed_by_date: event.event_date || undefined,
              chef_comment: `Remaining system minimum (${s.confirmed_quantity} confirmed of ${s.minimum_quantity} ${unit})`,
              ...lineCosting(item, unit, { zeroIsUncosted: true, rules: unitRules }),
              inventory_decision: 'pending',
              chef_response: 'none',
              is_agreed: false,
              is_active: true,
              sort_order: idx + 1,
            };
          });
          if (payloads.length) {
            await svc.entities.RequisitionLine.bulkCreate(payloads);
          }
        }
      }

      const writtenLines = await readAll(svc.entities.RequisitionLine, { requisition_id: created.id });
      const totals = costTotals(writtenLines);
      await appendRevision(
        svc,
        created,
        {
          side: 'chef',
          action: 'created',
          ...actor,
          comment:
            body.prefill_shortfalls === true && writtenLines.length
              ? `Additional requisition #${nextSeq} created with ${writtenLines.length} remaining minimum item(s)`
              : `Additional requisition #${nextSeq} created`,
          allowance_configured_at_check: allowanceState.configured,
          allowance_remaining_before: allowanceState.remaining,
          line_snapshots: writtenLines.map((l) => snapshotOf(l, null, Number(l.requested_quantity) || 0, l.chef_comment || '')),
        },
        totals
      );

      return Response.json({
        requisition_id: created.id,
        requisition_number: created.requisition_number,
        requisition_sequence: nextSeq,
        lines_created: writtenLines.length,
        ...totals,
      });
    }

    if (!PLANNING_FLAGS.some((flag) => permissions[flag] === true))
      return Response.json({ error: 'Forbidden: requires catering planning access' }, { status: 403 });
    if (permissions.branch_id && permissions.branch_id !== event.branch_id)
      return Response.json({ error: 'Forbidden: this event belongs to another branch' }, { status: 403 });
    const actor = { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: permissions.role || '' };

    if (phase === 'closeout') {
      const out = await closeoutRequisitions(svc, event, permissions, actor, { resolution: body.resolution, reason: body.reason, context: body.context });
      return Response.json(out.body, { status: out.status });
    }

    if (phase === 'cancel') {
      const open = (await svc.entities.Requisition.filter({ event_id: event.id })).filter((r) => RELEASE_CANCELS.includes(r.status));
      if (!open.length) return Response.json({ cancelled: [] });
      const held = await svc.entities.CateringReservation.filter({ event_id: event.id, status: 'reserved' }, '-created_date', 1);
      if (held.length) return Response.json({ error: 'This event still holds reserved stock, so its requisition stays open', code: 'still_reserved' }, { status: 409 });
      const why = String(body.reason || 'Reservations released').slice(0, 300);
      for (const draft of open)
        await cancelRequisition(svc, draft, actor, {
          source: 'reservations_released', reason: 'Reservations released',
          comment: `Cancelled: the event's reservations were released (${why}). Planning again reopens this requisition.`,
        });
      return Response.json({ cancelled: open.map((r) => r.requisition_number) });
    }

    const flow = await getRequisitionFlow(svc, event);
    if (flow.mode !== 'requisition')
      return Response.json({ error: `This event is not on the requisition flow (${flow.mode})`, code: flow.mode }, { status: 409 });
    if (flow.locked) return Response.json({ error: lockedMessage(flow), code: flow.issued ? 'stock_issued' : 'locked' }, { status: 409 });
    if (flow.duplicates?.length) await keepOldestActive(svc, event.id, actor);

    const reservations = (await readAll(svc.entities.CateringReservation, { event_id: event.id, status: 'reserved' })).sort(byPlanOrder);
    if (!flow.requisition && !reservations.length) return Response.json({ requisition: null });

    const itemIds = [...new Set(reservations.map((r) => r.inventory_item_id).filter(Boolean))];
    const [items, unitRules] = await Promise.all([
      itemIds.length ? readAll(svc.entities.InventoryItem, { id: { $in: itemIds } }) : [],
      loadConversionRules(svc),
    ]);
    const itemById = new Map(items.map((i) => [i.id, i]));
    const header = {
      event_name: event.event_name || '', event_date: event.event_date, branch_name: event.branch_name || '',
      created_from_quote_id: event.active_quote_id || reservations[0]?.quote_id || '',
      last_action_by: actor.actor_name, last_action_date: new Date().toISOString(),
    };

    let requisition = flow.requisition;
    let action = 'replanned';
    if (!requisition && flow.cancelled) {
      requisition = flow.cancelled;
      action = 'reopened';
    } else if (!requisition) {
      const code = event.event_code || event.id.slice(-6).toUpperCase();
      const created = await svc.entities.Requisition.create({
        ...header, branch_id: event.branch_id, event_id: event.id,
        requisition_number: `REQ-${code}${flow.total ? `-${flow.total + 1}` : ''}`,
        status: 'draft', awaiting_side: 'chef', approval_status: 'not_required', current_revision: 0, counter_round: 0,
      });
      // No unique constraint on the platform: create, then verify — the oldest active requisition wins.
      const keeper = await keepOldestActive(svc, event.id, actor);
      if (keeper && keeper.id !== created.id)
        return Response.json({ requisition_id: keeper.id, requisition_number: keeper.requisition_number, action: 'duplicate_cancelled' });
      requisition = created;
      action = 'created';
    }

    const keptExtras = action === 'reopened' ? await reopenExtraLines(svc, requisition) : [];
    const before = action === 'created' ? [] : await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id });
    const plan = planLineSync(before, reservations, (r) => lineCosting(itemById.get(r.inventory_item_id), r.unit, { rules: unitRules }));
    const scope = { requisition_id: requisition.id, event_id: event.id, branch_id: event.branch_id };
    if (plan.creates.length) await svc.entities.RequisitionLine.bulkCreate(plan.creates.map((line) => ({ ...scope, ...line })));
    if (plan.updates.length) await svc.entities.RequisitionLine.bulkUpdate(plan.updates);
    if (plan.deactivations.length) await svc.entities.RequisitionLine.bulkUpdate(plan.deactivations.map((l) => ({ id: l.id, is_active: false })));

    // Idempotency sweep: simultaneous runs can each create a line for the same reservation —
    // keep the oldest active planned line per reservation_id, deactivate the rest.
    const written = (await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id }))
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    const duplicates = duplicatePlannedLines(written);
    const duplicateIds = new Set(duplicates.map((l) => l.id));
    if (duplicates.length) await svc.entities.RequisitionLine.bulkUpdate(duplicates.map((l) => ({ id: l.id, is_active: false })));
    const lines = written.map((l) => (duplicateIds.has(l.id) ? { ...l, is_active: false } : l));
    const newReservationIds = new Set(plan.creates.map((c) => c.reservation_id));
    const added = lines.filter((l) => l.is_active !== false && newReservationIds.has(l.reservation_id));
    const addedSnapshots = (reason) => added.map((l) => snapshotOf(l, null, l.requested_quantity, reason));
    const removed = plan.deactivations.length;
    const changed = plan.changes.length - removed;
    const entry = action === 'created'
      ? { side: 'system', action, ...actor, comment: `Draft requisition created from planning: ${added.length} planned line(s)`, line_snapshots: addedSnapshots('') }
      : action === 'reopened'
      ? { side: 'system', action, ...actor,
          comment: `Reopened as draft by planning: ${added.length} planned line(s) rebuilt, ${keptExtras.length} extra line(s) kept as pending`,
          line_snapshots: [...addedSnapshots('Rebuilt by replanning'), ...keptExtras.map((l) => snapshotOf(l, null, Number(l.requested_quantity) || 0, 'Extra kept as pending'))] }
      : { side: 'system', action, ...actor,
          comment: added.length || plan.changes.length
            ? `Plan recalculated: ${added.length} added, ${removed} removed, ${changed} quantity change(s)`
            : 'Plan recalculated: no line changes',
          line_snapshots: [...addedSnapshots('Added by replanning'), ...plan.changes] };
    const reopen = action === 'reopened'
      ? { status: 'draft', awaiting_side: 'chef', counter_round: 0, approval_status: 'not_required', approved_by: '', approval_reason: '',
          approved_date: null, approved_extras_cost: null, approved_uncosted_extra_ids: [], approved_uncosted_quantities: [], approval_restore: null,
          rejection_reason: '', rejected_by: '', rejected_date: null,
          cancelled_by: '', cancelled_date: null, cancel_reason: '', cancel_source: '', batch_proposal: null, batch_count: 0 }
      : {};
    const totals = costTotals(lines);
    await appendRevision(svc, requisition, entry, { ...header, ...reopen, ...totals });
    if (duplicates.length)
      await appendRevision(svc, requisition, {
        side: 'system', action: 'deduplicated', ...actor,
        comment: `${duplicates.length} duplicate planned line(s) deactivated — one line kept per reservation`,
        line_snapshots: duplicates.map((l) => snapshotOf(l, Number(l.requested_quantity), null, 'Duplicate: an older active line already covers this reservation')),
      });

    await refreshEventRequisitionBaseline(svc, event).catch(() => {});

    return Response.json({
      requisition_id: requisition.id, requisition_number: requisition.requisition_number, action,
      active_lines: lines.filter((l) => l.is_active !== false).length, ...totals, changes: entry.line_snapshots.length,
      duplicates_deactivated: duplicates.length,
    });
  } catch (error) {
    console.error('syncEventRequisition failed', JSON.stringify({ event_id: body?.event_id || null, phase: body?.phase || 'check', error: error?.message }));
    return Response.json({ error: error.message }, { status: 500 });
  }
}