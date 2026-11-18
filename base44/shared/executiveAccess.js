import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { isCentralAdmin, isSafetyValveEmail } from './platformRole.js';
import { financeAuditClient } from './financeAuditClient.js';
import { requireValue } from './financeValidation.js';

// Who may read Executive Dashboard figures: the permissions that open the
// screen (analytics or financial viewing), or an admin under the central rule
// the branch picker uses. Replies carry totals only, never single records.
export async function executiveContext(base44) {
  const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
  requireValue(user, 'Sign in to open the Executive Dashboard.', 401);
  const permissions = await getEffectivePermissions(base44, user), admin = isCentralAdmin(user, permissions);
  requireValue(admin || (!permissions.access_denied && (permissions.analytics_view || permissions.financial_view)), 'Viewing the Executive Dashboard needs analytics or financial viewing permission.', 403);
  const ctx = { base44, user, permissions, admin, auditRequestId: crypto.randomUUID() };
  ctx.svc = financeAuditClient(ctx);
  return ctx;
}

// Modules that close with their parent (the parent of src/lib/moduleRegistry.js).
const PARENT = {
  my_custody: 'catering', assets_resources: 'catering', catering_portal: 'catering', operational_meetings: 'hr_employees',
  selling_priority: 'inventory', executive_dashboard: 'analytics', sales_reporting: 'analytics', client_analytics: 'crm',
  manufacturing_analytics: 'manufacturing', menu_profitability: 'menu', butchery_analytics: 'butchery', branch_comparison: 'multi_branch',
  cashback: 'genmo', rewards: 'genmo', referrals: 'genmo', registrations: 'genmo',
};

// Admin › Modules switches as this person sees them: closed for everyone, or
// in their role / own module access (the safety-valve account skips the
// personal ones); a module is also off while its parent is. Returns isOn(moduleKey).
export async function moduleSwitches(ctx) {
  const [settings] = await ctx.svc.entities.SystemSettings.filter({ setting_key: 'default' });
  const own = isSafetyValveEmail(ctx.user.email) ? [] : ctx.permissions.disabled_modules || [];
  const off = new Set([...(settings?.disabled_modules || []), ...own]);
  return (key) => !off.has(key) && !off.has(PARENT[key]);
}

// Branches a report covers: the picker's selection, or only the person's own
// branch when their access is locked to one. An empty list means all branches.
export function reportBranches(ctx, requested) {
  if (!ctx.admin && ctx.permissions.branch_id) return [ctx.permissions.branch_id];
  return Array.isArray(requested) ? requested.filter((id) => typeof id === 'string' && id).slice(0, 100) : [];
}