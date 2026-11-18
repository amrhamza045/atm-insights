import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../../shared/platformRole.js';

// Header branch picker: which company (Admin › Companies) each branch belongs to.
// Read-only and limited to what the picker shows; never returns Finance settings.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const permissions = await getEffectivePermissions(base44, user);
    if (permissions.access_denied) return Response.json({ companies: [] });

    // Same branch lock the picker applies: central admins see every branch.
    const lock = isCentralAdmin(user, permissions) ? null : permissions.branch_id || null;
    const page = await base44.asServiceRole.entities.FinanceCompany.filter({}, { sort: 'created_date', limit: 100 });
    const companies = page.items
      .map((c) => ({
        id: c.id,
        name: c.name,
        company_code: c.company_code || '',
        is_active: c.is_active !== false,
        is_test: !!c.is_test,
        branch_ids: (c.branch_ids || []).filter((id) => !lock || id === lock),
      }))
      .filter((c) => c.branch_ids.length > 0);

    return Response.json({ companies });
  } catch (error) {
    console.error('Branch picker companies failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}