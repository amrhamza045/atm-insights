import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { audit } from '../_shared/auditLog.js';
import { movementRow, recordMovements } from '../_shared/inventoryMovements.js';
import { wasteContext, postWasteDeclaration } from '../_shared/inventoryWastePosting.js';

/**
 * Auto-approves a newly created request when the global setting is on AND the
 * requester (record creator) holds the live approval permission for that type.
 * Mirrors the Approvals Center's approve action. Request types that require an
 * independent approver (catering payments, deposit withdrawals, quotes) are not
 * handled here and always stay pending.
 */
const RULES = {
  Expense: { pending: 'pending', perm: 'expense_approve', data: (by) => ({ status: 'approved', approved_by: by }) },
  CashierPurchase: { pending: 'pending', perm: 'cashier_purchase_approve', data: (by) => ({ status: 'approved', approved_by: by }) },
  RegistrationRequest: { pending: 'pending_admin', perm: 'registrations_approve', data: () => ({ status: 'approved', admin_approved: true }) },
  Redemption: { pending: 'pending', perm: 'redemptions_approve', data: (by) => ({ status: 'approved', approved_by: by }) },
  Payout: { pending: 'pending', perm: 'payouts_approve', data: (by) => ({ status: 'completed', processed_by: by }) },
  LevelUpgradeRequest: { pending: 'pending', perm: 'level_upgrade_approve', data: (by) => ({ status: 'approved', approved_by: by }) },
  BalanceRecharge: { pending: 'pending', perm: 'recharge_approve', data: (by) => ({ status: 'approved', approved_by: by }) },
  Return: { pending: 'pending', perm: 'return_approve', data: () => ({ status: 'approved' }) },
  WasteDeclaration: { pending: 'pending', perm: 'waste_approve', data: (by) => ({ status: 'approved', approved_by: by }) },
  Review: { pending: 'pending', perm: 'review_moderate', data: () => ({ status: 'approved', admin_notes: 'Auto-approved by system' }) },
  DeliveryBonusRecord: { pending: 'pending', perm: 'delivery_bonus_approve', data: () => ({ status: 'paid', paid_date: new Date().toISOString() }) },
  CashbackDistributionPending: { pending: 'pending_approval', perm: ['cashback_dist_approve', 'payouts_approve'], data: (by) => ({ status: 'approved', approved_by: by }) },
  PurchaseOrder: { pending: 'pending_approval', perm: 'purchase_approve', data: (by) => ({ status: 'pending', reviewed_by: by, reviewed_at: new Date().toISOString() }) },
};

// The automatic run fires right after a request is created. Anyone but an admin
// can only trigger it for a request created in the last few minutes, never later.
const FRESH_MS = 15 * 60 * 1000;
function isFresh(created) {
  const s = String(created || '');
  const t = Date.parse(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
  const age = Date.now() - t;
  return Number.isFinite(t) && age <= FRESH_MS && age >= -60000;
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const { entity, id } = await req.json();
    const rule = RULES[entity];
    if (!rule || !id) return Response.json({ skipped: 'unsupported' });

    const settings = await svc.entities.SystemSettings.filter({ setting_key: 'approval_settings' });
    if (settings[0]?.auto_approve_with_permission !== true) return Response.json({ skipped: 'disabled' });

    const record = await svc.entities[entity].get(id).catch(() => null);
    if (!record || record.status !== rule.pending || !record.created_by_id) return Response.json({ skipped: 'not_pending' });

    const caller = await base44.auth.me().catch(() => null);
    if (caller?.role !== 'admin' && !isFresh(record.created_date)) return Response.json({ skipped: 'not_new' });

    const requester = await svc.entities.User.get(record.created_by_id).catch(() => null);
    if (!requester?.email) return Response.json({ skipped: 'no_requester' });

    const perms = await getEffectivePermissions(base44, requester);
    const keys = [].concat(rule.perm);
    if (requester.role !== 'admin' && !keys.some((k) => perms?.[k] === true)) return Response.json({ skipped: 'no_permission' });

    const by = `${requester.full_name || requester.email} (auto-approved)`;
    await svc.entities[entity].update(id, rule.data(by));

    if (entity === 'WasteDeclaration' && record.inventory_item_id) {
      const inv = await svc.entities.InventoryItem.get(record.inventory_item_id).catch(() => null);
      if (inv) {
        const after = (inv.quantity || 0) - (record.quantity_wasted || 0);
        await svc.entities.InventoryItem.update(inv.id, { quantity: after });
        await recordMovements(svc.entities, [movementRow(inv, {
          key: `waste:${id}`, direction: 'out', type: 'waste', quantity: record.quantity_wasted, unit: record.unit,
          before: inv.quantity || 0, after, ...(Number(record.cost_impact) > 0 ? { cost_impact: Number(record.cost_impact) } : {}),
          source_entity: 'WasteDeclaration', source_id: id, source_label: `Waste · ${String(record.reason || 'other').replace(/_/g, ' ')}`,
          event_id: record.event_id, actor_email: requester.email, notes: record.notes,
        })]);
      }
    }
    if (entity === 'WasteDeclaration') await postWasteDeclaration(wasteContext(base44, requester), id).catch((e) => console.error('Waste posting failed:', e.message));

    if (entity === 'CashbackDistributionPending') await svc.functions.invoke('executeCashbackDistribution', { pending_id: id });

    await audit(base44, requester, 'approve', entity, `Auto-approved by system: requester holds ${keys.join(' / ')}`, { entityId: id });
    return Response.json({ approved: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
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
