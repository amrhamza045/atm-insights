import { numberOrNull, readAll, roundMoney } from './cateringActualCostCommon.js';
import { costTotals, isCosted } from './requisitionPlannedLines.js';
import { plannedFoodCostOfQuote } from './cateringMarginBridge.js';

/** Line fields a rejection puts back exactly as they were before the triggering action. */
export const RESTORE_FIELDS = { requested_quantity: 0, agreed_quantity: null, inventory_decision: 'pending', chef_response: 'none', is_agreed: false, chef_comment: '', decision_reason: '' };
const APPLIED_KEYS = [
  'limit_percent_applied', 'limit_amount_applied', 'planned_food_cost_applied', 'planned_food_cost_source',
  'extras_total_applied', 'uncosted_extras_count',
  'allowance_configured_at_check', 'allowance_remaining_before', 'allowance_deducted_amount',
];

/** A line's counted quantity: agreed qty once agreed, else requested. */
export const extraQty = (l) => Number(l.is_agreed === true ? l.agreed_quantity : l.requested_quantity) || 0;

/**
 * Position of lines counted toward the check:
 *  - For the first (primary) requisition: active extra lines Inventory hasn't declined (though the first requisition never blocks for approval per PRD).
 *  - For additional requisitions (is_additional: true): all active non-declined lines on the requisition.
 */
export function extrasPosition(lines, isAdditional = false) {
  const counted = lines.filter(
    (l) => l.is_active !== false && (isAdditional || l.line_type === 'extra') && l.inventory_decision !== 'declined'
  );
  const qtyOf = extraQty;
  const total = roundMoney(counted.filter(isCosted).reduce((s, l) => s + qtyOf(l) * Number(l.estimated_unit_cost), 0));
  return { total, uncosted: counted.filter((l) => !isCosted(l)) };
}

/**
 * Agreed value of a confirmed additional requisition: sum of agreed_quantity × estimated_unit_cost
 * across all active agreed lines with agreed_quantity > 0.
 */
export function agreedRequisitionValue(lines) {
  const agreedLines = (lines || []).filter(
    (l) => l.is_active !== false && l.is_agreed === true && Number(l.agreed_quantity) > 0 && isCosted(l)
  );
  return roundMoney(
    agreedLines.reduce((sum, l) => sum + (Number(l.agreed_quantity) || 0) * (Number(l.estimated_unit_cost) || 0), 0)
  );
}

/**
 * Load the event's configured additional requisition allowance and how much has already been consumed
 * by mutually confirmed additional requisitions.
 */
export async function getEventAllowanceState(svc, eventId, excludeRequisitionId = null) {
  const [[settings], event, allReqs] = await Promise.all([
    svc.entities.CateringSettings.list(),
    svc.entities.CateringEvent.get(eventId).catch(() => null),
    svc.entities.Requisition.filter({ event_id: eventId }),
  ]);
  const configured = Math.max(0, roundMoney(numberOrNull(settings?.additional_requisition_allowance_amount) ?? 0));

  // Sum deductions from mutually confirmed additional requisitions (excluding the current one if specified)
  const confirmedAdditionals = (allReqs || []).filter(
    (r) =>
      r.id !== excludeRequisitionId &&
      r.is_additional === true &&
      r.status !== 'cancelled' &&
      ['confirmed', 'scheduled', 'fulfilled'].includes(r.status)
  );

  let used = 0;
  for (const r of confirmedAdditionals) {
    if (numberOrNull(r.allowance_deducted_amount) !== null) {
      used = roundMoney(used + Number(r.allowance_deducted_amount));
    } else {
      const rLines = await readAll(svc.entities.RequisitionLine, { requisition_id: r.id });
      used = roundMoney(used + agreedRequisitionValue(rLines));
    }
  }

  const remaining = Math.max(0, roundMoney(configured - used));
  return { configured, used, remaining, settings, event };
}

/**
 * Concurrency-safe allowance check & atomic reservation on CateringEvent.additional_requisition_allowance_used
 * when an additional requisition is about to be mutually confirmed.
 *
 * Uses compare-and-swap on CateringEvent.additional_requisition_allowance_used so two competing confirmations
 * for the same event cannot both pass against the same remaining balance:
 * - If this requisition was NOT yet approved (or its agreed value exceeds its approved cap) and the live
 *   remaining allowance is now less than the agreed value (or there are uncosted agreed lines), it returns
 *   { fits: false, routedToApproval: true, reason, applied, check } without deducting or confirming.
 * - If it fits (within remaining allowance, or within the approver's approved_extras_cost cap), it atomically
 *   claims the new cumulative used total on CateringEvent and stamps the deduction on Requisition.
 */
export async function claimEventAllowanceOnConfirm(svc, requisition, lines) {
  const isAdditional = requisition?.is_additional === true || (Number(requisition?.requisition_sequence) || 1) > 1;
  if (!isAdditional) return { fits: true, deduction: null };

  if (requisition.allowance_deducted_at && numberOrNull(requisition.allowance_deducted_amount) !== null) {
    return {
      fits: true,
      deduction: { deducted: Number(requisition.allowance_deducted_amount), alreadyDeducted: true },
    };
  }

  const activeLines = (lines || (await readAll(svc.entities.RequisitionLine, { requisition_id: requisition.id }))).filter(
    (l) => l.is_active !== false
  );
  const agreedLines = activeLines.filter((l) => l.is_agreed === true && Number(l.agreed_quantity) > 0);
  const uncostedAgreed = agreedLines.filter((l) => !isCosted(l));
  const deducted = agreedRequisitionValue(activeLines);
  const approvedCap =
    requisition.approval_status === 'approved' ? numberOrNull(requisition.approved_extras_cost) : null;
  const coveredUncosted = new Set(requisition.approved_uncosted_extra_ids || []);
  const approvedUncostedQty = new Map(
    (requisition.approved_uncosted_quantities || []).map((x) => [x.line_id, Number(x.quantity)])
  );

  const MAX_CAS_ATTEMPTS = 20;
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const [stateBefore, planned] = await Promise.all([
      getEventAllowanceState(svc, requisition.event_id, requisition.id),
      plannedFoodCost(svc, requisition, activeLines),
    ]);
    const eventRecord = stateBefore.event;
    const currentEventUsed = numberOrNull(eventRecord?.additional_requisition_allowance_used);
    // Effective used amount is the maximum of the event's atomic counter and the sum of confirmed requisitions
    const effectiveUsed = Math.max(stateBefore.used, roundMoney(currentEventUsed ?? 0));
    const liveRemaining = Math.max(0, roundMoney(stateBefore.configured - effectiveUsed));
    const percent = numberOrNull(stateBefore.settings?.extra_items_limit_percent) ?? 0;

    // Check whether this confirmation is covered by an existing CEO/Approver approval or by the live remaining allowance
    const reasons = [];
    if (approvedCap !== null) {
      if (deducted > approvedCap + 1e-6) {
        reasons.push(
          `Agreed additional requisition value (${deducted} EGP) exceeds the approved cap of ${approvedCap} EGP`
        );
      }
      const unapprovedUncosted = uncostedAgreed.filter((l) => !coveredUncosted.has(l.id));
      if (unapprovedUncosted.length) {
        reasons.push(
          `Uncosted item(s) require approval: ${unapprovedUncosted.map((l) => l.inventory_item_name || l.id).join(', ')}`
        );
      }
      for (const l of uncostedAgreed) {
        if (coveredUncosted.has(l.id) && approvedUncostedQty.has(l.id)) {
          const capQty = approvedUncostedQty.get(l.id);
          if ((Number(l.agreed_quantity) || 0) > capQty + 1e-6) {
            reasons.push(
              `Uncosted item ${l.inventory_item_name || l.id} agreed at ${l.agreed_quantity}, above approved ${capQty}`
            );
          }
        }
      }
    } else {
      if (deducted > liveRemaining + 1e-6) {
        reasons.push(
          `Event allowance balance changed while confirming: agreed value ${deducted} EGP exceeds the remaining allowance of ${liveRemaining} EGP (configured ${stateBefore.configured} EGP, used ${effectiveUsed} EGP). Routed to Approval Center.`
        );
      }
      if (uncostedAgreed.length) {
        reasons.push(
          `Uncosted item(s) cannot be verified against the money allowance: ${uncostedAgreed.map((l) => l.inventory_item_name || l.id).join(', ')}`
        );
      }
    }

    const applied = {
      limit_percent_applied: percent,
      limit_amount_applied: liveRemaining,
      planned_food_cost_applied: planned.amount,
      planned_food_cost_source: planned.source,
      extras_total_applied: deducted,
      uncosted_extras_count: uncostedAgreed.length,
      allowance_configured_at_check: stateBefore.configured,
      allowance_remaining_before: liveRemaining,
      allowance_deducted_amount: null,
    };

    if (reasons.length > 0) {
      const reason = reasons.join('; ');
      return {
        fits: false,
        routedToApproval: true,
        reason,
        applied,
        check: {
          needsApproval: true,
          reason,
          allowance: { ...stateBefore, used: effectiveUsed, remaining: liveRemaining },
          applied,
        },
      };
    }

    const newTotalUsed = roundMoney(effectiveUsed + deducted);
    // Atomic compare-and-swap on CateringEvent.additional_requisition_allowance_used
    const matchCondition =
      currentEventUsed === null
        ? {
            id: requisition.event_id,
            $or: [
              { additional_requisition_allowance_used: { $exists: false } },
              { additional_requisition_allowance_used: null },
              { additional_requisition_allowance_used: 0 },
            ],
          }
        : {
            id: requisition.event_id,
            additional_requisition_allowance_used: currentEventUsed,
          };

    const { updated } = await svc.entities.CateringEvent.updateMany(matchCondition, {
      $set: { additional_requisition_allowance_used: newTotalUsed },
    });

    if (updated === 1) {
      const now = new Date().toISOString();
      await svc.entities.Requisition.update(requisition.id, {
        allowance_configured_at_check: stateBefore.configured,
        allowance_remaining_before: liveRemaining,
        allowance_deducted_amount: deducted,
        allowance_deducted_at: now,
      });

      return {
        fits: true,
        deduction: {
          deducted,
          configured: stateBefore.configured,
          usedBefore: effectiveUsed,
          usedAfter: newTotalUsed,
          remainingAfter: Math.max(0, roundMoney(stateBefore.configured - newTotalUsed)),
        },
      };
    }

    // Another confirmation updated the event's allowance concurrently — backoff briefly and re-verify against the new balance
    await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 60));
  }

  throw new Error('Concurrent allowance update conflict — please retry');
}

/**
 * Backwards-compatible wrapper around claimEventAllowanceOnConfirm.
 */
export async function recordAllowanceDeductionOnConfirm(svc, requisition, lines) {
  const res = await claimEventAllowanceOnConfirm(svc, requisition, lines);
  return res.deduction;
}

/**
 * Base of the %: the planned food cost of the event's CURRENT active quote, read live at every check.
 */
async function plannedFoodCost(svc, requisition, lines) {
  const event = await svc.entities.CateringEvent.get(requisition.event_id).catch(() => null);
  const quote = event?.active_quote_id ? await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null) : null;
  const food = plannedFoodCostOfQuote(quote);
  if (food !== null) return { amount: food, source: 'quote_food_cost' };
  return { amount: costTotals(lines).planned_estimated_cost, source: 'requisition_planned_estimate' };
}

/**
 * Requisition approval & allowance check:
 *  1. First requisition ever (is_additional !== true):
 *     Per PRD Core Flow 5, the first requisition is free for editing — kitchen can request extra or less
 *     than the system-generated minimum as they please and it goes through the normal cycle with Inventory
 *     without requiring approval.
 *  2. Second and subsequent requisitions (is_additional === true):
 *     Checked against the event's remaining money allowance (configured in Admin / Catering settings).
 *     - If remaining > 0 and total <= remaining (with no uncosted lines): proceeds directly to Inventory
 *       negotiation within the remaining allowance.
 *     - Once the allowance is exhausted (remaining <= 0) or the request exceeds the remaining allowance
 *       (or has uncosted items): requires Approval Center approval (requisition_approve) before Inventory
 *       negotiation can proceed.
 */
export async function approvalCheck(svc, requisition, lines) {
  const isAdditional = requisition.is_additional === true || (Number(requisition.requisition_sequence) || 1) > 1;
  const [allowanceState, planned] = await Promise.all([
    getEventAllowanceState(svc, requisition.event_id, requisition.id),
    plannedFoodCost(svc, requisition, lines),
  ]);
  const percent = numberOrNull(allowanceState.settings?.extra_items_limit_percent) ?? 0;
  const limit = roundMoney((planned.amount * percent) / 100);
  const { total, uncosted } = extrasPosition(lines, isAdditional);

  if (!isAdditional) {
    // First requisition is free for editing and goes directly through the normal Inventory negotiation cycle.
    return {
      needsApproval: false,
      reason: '',
      applied: {
        limit_percent_applied: percent,
        limit_amount_applied: limit,
        planned_food_cost_applied: planned.amount,
        planned_food_cost_source: planned.source,
        extras_total_applied: total,
        uncosted_extras_count: uncosted.length,
        allowance_configured_at_check: allowanceState.configured,
        allowance_remaining_before: allowanceState.remaining,
        allowance_deducted_amount: null,
      },
    };
  }

  // Additional requisition (2nd, 3rd, etc.)
  const approved = numberOrNull(requisition.approved_extras_cost);
  const names = (ls) => ls.map((l) => l.inventory_item_name || l.id).join(', ');
  const reasons = [];

  if (approved !== null) {
    // Already approved by CEO / Approver for this requisition: re-trigger approval only if the chef raises above the approved amount or adds uncosted items
    const covered = new Set(requisition.approved_uncosted_extra_ids || []);
    const fresh = uncosted.filter((l) => !covered.has(l.id));
    const approvedQty = new Map((requisition.approved_uncosted_quantities || []).map((x) => [x.line_id, Number(x.quantity)]));
    const raised = uncosted.filter((l) => covered.has(l.id) && approvedQty.has(l.id) && extraQty(l) > approvedQty.get(l.id));
    if (total > approved + 1e-6) {
      reasons.push(`Additional requisition value ${total} EGP exceeds the approved ${approved} EGP`);
    }
    if (fresh.length) reasons.push(`New uncosted item(s): ${names(fresh)}`);
    raised.forEach((l) => reasons.push(`Uncosted item ${l.inventory_item_name || l.id} raised to ${extraQty(l)}, above the approved ${approvedQty.get(l.id)}`));
  } else {
    if (allowanceState.remaining <= 0) {
      reasons.push(
        `Event additional requisition allowance (${allowanceState.configured} EGP) is exhausted (${allowanceState.used} EGP already used) — requires Approval Center approval for ${total} EGP`
      );
    } else if (total > allowanceState.remaining + 1e-6) {
      reasons.push(
        `Additional requisition value ${total} EGP exceeds the event's remaining allowance of ${allowanceState.remaining} EGP (configured ${allowanceState.configured} EGP, used ${allowanceState.used} EGP)`
      );
    }
    if (uncosted.length) {
      reasons.push(`Uncosted item(s) cannot be verified against the money allowance: ${names(uncosted)}`);
    }
  }

  return {
    needsApproval: reasons.length > 0,
    reason: reasons.join('; '),
    allowance: allowanceState,
    applied: {
      limit_percent_applied: percent,
      limit_amount_applied: allowanceState.remaining,
      planned_food_cost_applied: planned.amount,
      planned_food_cost_source: planned.source,
      extras_total_applied: total,
      uncosted_extras_count: uncosted.length,
      allowance_configured_at_check: allowanceState.configured,
      allowance_remaining_before: allowanceState.remaining,
      allowance_deducted_amount: requisition.allowance_deducted_amount ?? null,
    },
  };
}

/** Values stored on a revision written by a check. */
export const revisionValues = (check) => ({ ...check.applied, approval_reason: check.needsApproval ? check.reason : '' });
/** The stored values of the check that raised the pending approval. */
export const appliedOf = (requisition) => ({ ...Object.fromEntries(APPLIED_KEYS.map((k) => [k, requisition[k] ?? null])), approval_reason: requisition.approval_reason || '' });

/** State just before the triggering action, restored exactly by a rejection. */
export const restorePoint = (requisition, active) => ({
  status: requisition.status, awaiting_side: requisition.awaiting_side, counter_round: Number(requisition.counter_round) || 0,
  submitted_at: requisition.submitted_at || null,
  lines: active.map((l) => ({ id: l.id, ...Object.fromEntries(Object.entries(RESTORE_FIELDS).map(([k, d]) => [k, l[k] ?? d])) })),
});

export const approvalRequestPatch = (check, restore) => ({
  status: 'pending_approval', awaiting_side: 'approver', approval_status: 'pending', approval_reason: check.reason,
  approval_restore: restore, ...check.applied,
});

/** No approval needed: record the values; a stale rejection falls back to the last approval state. */
export const noApprovalPatch = (requisition, check) => ({
  ...check.applied,
  ...(requisition.approval_status === 'rejected' ? { approval_status: numberOrNull(requisition.approved_extras_cost) !== null ? 'approved' : 'not_required' } : {}),
});