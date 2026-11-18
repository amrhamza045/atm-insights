import { loadActualSources } from './loadCateringActualSources.js';
import { calculateActualCosts, cancelledActualCosts, ACTUAL_COST_VERSION } from './cateringActualCostCalculation.js';
import { assertEventBranch } from './cateringActualCostCommon.js';

// Exception totals live in the run's bridge/audit and the exception records; the event keeps its existing fields.
const eventFields = ({ actual_exception_cost, ...rest }) => rest;

export async function recomputeActualEvent(base44, user, permissions, eventId, { dryRun = false, includeAudit = false } = {}) {
  const entities = base44.asServiceRole.entities;
  for (let attempt = 0; attempt < 3; attempt++) {
    const event = await entities.CateringEvent.get(eventId);
    if (!event) { const error = new Error('Event not found'); error.status = 404; throw error; }
    assertEventBranch(user, permissions, event);
    let computation;
    if (event.status === 'cancelled') computation = cancelledActualCosts(event);
    else {
      const sources = await loadActualSources(entities, event);
      if (event.status !== 'completed' && !sources.reconciliation) return { event_id: event.id, event_name: event.event_name, status: 'not_computed', warning_codes: [], reason: 'Event is not completed or finalized yet' };
      computation = calculateActualCosts(sources);
    }
    const { fields, bridge, audit, equipmentUpdates } = computation;
    const at = new Date().toISOString();
    fields.actual_cost_computed_at = at;
    audit.calculated_at = at;
    const result = { event_id: event.id, event_name: event.event_name, status: fields.actual_cost_status, warning_codes: fields.actual_cost_warning_codes, fields, source_counts: audit.source_counts };
    if (includeAudit || dryRun) result.audit = audit;
    if (dryRun) return { ...result, dry_run: true };
    // Evidence lives in private file storage rather than a potentially oversized entity field.
    const file = new File([JSON.stringify(audit, null, 2)], `catering-actual-costs-${event.id}-${Date.now()}.json`, { type: 'application/json' });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const run = await entities.CateringActualCostRun.create({
      event_id: event.id, branch_id: event.branch_id, calculated_at: at, calculated_by: user.email || user.id,
      version: ACTUAL_COST_VERSION, status: fields.actual_cost_status, currency: 'EGP',
      food_cost: fields.actual_food_cost, labor_cost: fields.actual_labor_cost, equipment_cost: fields.actual_equipment_cost,
      total_cost: fields.actual_total_cost, revenue: fields.actual_revenue, margin: fields.actual_margin,
      margin_percentage: fields.actual_margin_percentage,
      margin_bridge_expected_margin: bridge?.expected_margin ?? null, margin_bridge_actual_margin: bridge?.actual_margin ?? null,
      margin_bridge_expected_delta: bridge?.expected_delta ?? null, margin_bridge_total_delta: bridge?.total_delta ?? null,
      margin_bridge_mismatch_amount: bridge?.mismatch_amount ?? null, margin_bridge_consistent: bridge?.consistent ?? null,
      margin_bridge_lines: bridge?.lines || [], margin_bridge_ranking: bridge?.ranking || [],
      warning_codes: fields.actual_cost_warning_codes, source_counts: audit.source_counts, audit_file_uri: uploaded.file_uri,
    });
    // Compare-and-set prevents an older concurrent calculation overwriting a newer event revision.
    const committed = await entities.CateringEvent.updateMany({ id: event.id, updated_date: event.updated_date }, { $set: { ...eventFields(fields), actual_cost_run_id: run.id } });
    if (!committed.updated) continue;
    // Set-derived amounts, never increments. Bulk updates intentionally do not trigger recursive workflows.
    for (const update of equipmentUpdates) {
      const { id, ...values } = update;
      const original = audit.equipment.rows.find(r => r.source_id === id && r.source_type === 'CateringEquipmentReservation');
      if (original) await entities.CateringEquipmentReservation.updateMany({ id, updated_date: original.source_updated_date }, { $set: values });
      else if (values.missing_cost === 0) await entities.CateringEquipmentReservation.updateMany({ id, missing_quantity: 0 }, { $set: values });
    }
    return { ...result, run_id: run.id };
  }
  const error = new Error('The event changed during calculation. Please recompute again.');
  error.status = 409; throw error;
}