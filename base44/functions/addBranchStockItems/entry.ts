import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { checkPermission } from '../../shared/requirePermission.js';
import { isCentralAdmin } from '../../shared/platformRole.js';
import { audit } from '../../shared/auditLog.js';
import { readAll } from '../../shared/cateringActualCostCommon.js';
import { twinFinder } from '../../shared/branchStock.js';

// Copied from the source item. Stock on hand, expiry and storage place stay the branch's own.
const COPIED = [
  'name', 'arabic_name', 'category_id', 'category_name', 'unit', 'purchase_unit', 'purchase_unit_label',
  'selling_unit', 'selling_unit_label', 'low_stock_threshold', 'cost_per_unit', 'supplier_id', 'supplier', 'lead_time_days',
];

/**
 * Adds stock items an event's branch doesn't stock yet to that branch, with none on hand,
 * so the branch plans, buys and holds its own stock of them. Items it already has are skipped.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { branch_id, item_ids } = await req.json().catch(() => ({}));
    const ids = [...new Set((Array.isArray(item_ids) ? item_ids : []).filter((id) => typeof id === 'string' && id))];
    if (!branch_id || !ids.length) return Response.json({ error: 'branch_id and item_ids are required' }, { status: 400 });
    if (ids.length > 500) return Response.json({ error: 'Too many items at once' }, { status: 400 });

    // The same people who can reserve stock for an event.
    const check = await checkPermission(base44, user, ['catering_edit', 'catering_approve', 'inventory_edit', 'purchase_edit']);
    if (!check.allowed) return Response.json({ error: check.reason }, { status: check.status });
    const lockedBranch = check.permissions?.branch_id;
    if (!isCentralAdmin(user, check.permissions) && lockedBranch && lockedBranch !== branch_id)
      return Response.json({ error: 'Forbidden: this branch is not yours' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const branch = await db.Branch.get(branch_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!branch) return Response.json({ error: 'Branch not found' }, { status: 404 });

    const [sources, own] = await Promise.all([
      db.InventoryItem.filter({ id: { $in: ids } }, '-created_date', ids.length),
      readAll(db.InventoryItem, { branch_id }),
    ]);
    const twinOf = twinFinder(own);
    const toAdd = sources
      .filter((s) => s.branch_id && s.branch_id !== branch_id && !twinOf(s))
      .map((s) => ({
        ...Object.fromEntries(COPIED.filter((k) => s[k] != null).map((k) => [k, s[k]])),
        branch_id,
        branch_name: branch.name || '',
        quantity: 0,
        source_item_id: s.source_item_id || s.id,
      }));

    if (toAdd.length) {
      await db.InventoryItem.bulkCreate(toAdd);
      await audit(
        base44, user, 'create', 'InventoryItem',
        `Added ${toAdd.length} stock item(s) to ${branch.name} for catering planning, none on hand: ${toAdd.map((i) => i.name).join(', ')}`.slice(0, 2000),
        { entityName: branch.name, changes: { branch_id, source_item_ids: toAdd.map((i) => i.source_item_id) } }
      );
    }
    return Response.json({ added: toAdd.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}