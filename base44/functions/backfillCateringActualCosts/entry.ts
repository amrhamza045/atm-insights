import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { recomputeActualEvent } from '../../shared/cateringActualCostPersist.js';
import { checkPermission } from '../../shared/requirePermission.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const permission = await checkPermission(base44, user, 'catering_finance');
    if (!permission.allowed) return Response.json({ error: permission.reason }, { status: permission.status });
    const body = await req.json();
    const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
    const limit = Math.min(5, Math.max(1, Math.floor(Number(body.limit) || 5)));
    const events = await base44.asServiceRole.entities.CateringEvent.filter({ status: { $in: ['completed', 'cancelled'] } }, 'id', limit + 1, offset);
    const results = [];
    for (const event of events.slice(0, limit)) results.push(await recomputeActualEvent(base44, user, permission.permissions, event.id, { dryRun: body.dry_run === true }));
    return Response.json({ results, has_more: events.length > limit, next_offset: offset + results.length });
  } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}