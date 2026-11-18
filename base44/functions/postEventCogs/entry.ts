import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { runInventoryJob } from '../../shared/inventoryAccountingJob.js';

// Recognizes COGS for a closed catering event (idempotent: retries return the prior journal).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
    if (user.role !== 'admin') {
      const perms = await getEffectivePermissions(base44, user);
      if (perms?.catering_edit !== true) return Response.json({ error: 'Permission required: catering_edit' }, { status: 403 });
    }
    const { event_id } = await req.json().catch(() => ({}));
    if (!event_id || typeof event_id !== 'string') return Response.json({ error: 'event_id is required.' }, { status: 400 });
    const ctx = { base44, svc: base44.asServiceRole, user, admin: true, permissions: {} };
    return Response.json(await runInventoryJob(ctx, { inventory_entity: 'CateringEvent', source_id: event_id }));
  } catch (error) {
    console.error('Event COGS posting failed:', error.message);
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}