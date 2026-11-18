import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { wasteContext, postWasteDeclaration } from '../../shared/inventoryWastePosting.js';

// Posts the finance journal for one approved waste declaration (idempotent).
// Callable by admins and people who may approve waste.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
    if (user.role !== 'admin') {
      const perms = await getEffectivePermissions(base44, user);
      if (perms?.waste_approve !== true) return Response.json({ error: 'Permission required: waste_approve' }, { status: 403 });
    }
    const { waste_id } = await req.json().catch(() => ({}));
    if (!waste_id || typeof waste_id !== 'string') return Response.json({ error: 'waste_id is required.' }, { status: 400 });
    return Response.json(await postWasteDeclaration(wasteContext(base44, user), waste_id));
  } catch (error) {
    console.error('Waste posting failed:', error.message);
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}