import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkPermission } from '../../shared/requirePermission.js';
import { recomputeActualEvent } from '../../shared/cateringActualCostPersist.js';
import { checkActualCostCalculation } from '../../shared/cateringActualCostChecks.js';

const eventSources = ['KitchenReleaseSlip', 'WasteDeclaration', 'CateringReturnedItem', 'CateringEquipmentMaintenance', 'CateringEquipmentReservation', 'CateringReconciliation'];
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const permission = await checkPermission(base44, user, ['catering_approve', 'catering_finance']);
    if (!permission.allowed) return Response.json({ error: permission.reason }, { status: permission.status });
    const body = await req.json();
    if (body.validate_calculation === true) {
      if (permission.permissions?.catering_finance !== true) return Response.json({ error: 'Forbidden: requires catering_finance' }, { status: 403 });
      return Response.json(checkActualCostCalculation());
    }
    let ids = [body.event_id, body.previous_event_id].filter(id => typeof id === 'string' && id.length);
    if (body.source_type && body.source_id && body.source_deleted !== true) {
      if (!eventSources.includes(body.source_type)) return Response.json({ error: 'Unsupported cost source' }, { status: 400 });
      const source = await base44.asServiceRole.entities[body.source_type].get(body.source_id);
      if (source?.event_id) ids.push(source.event_id);
    }
    ids = [...new Set(ids)];
    if (!ids.length) return Response.json({ skipped: true, reason: 'Source has no catering event attribution' });
    if (ids.length > 2) return Response.json({ error: 'At most two affected events per call' }, { status: 400 });
    const results = [];
    for (const id of ids) results.push(await recomputeActualEvent(base44, user, permission.permissions, id, { dryRun: body.dry_run === true, includeAudit: body.include_audit === true }));
    return Response.json({ result: results[0], results });
  } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}