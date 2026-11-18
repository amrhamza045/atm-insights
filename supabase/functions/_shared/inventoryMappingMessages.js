import { resolveAccountBinding } from './financeBindingResolver.js';

// Stock account roles and issue types used by inventory postings and their audit messages.
export const TASTING_HOLDING_KEY = 'TASTING_HOLDING_ACCOUNT';
export const ISSUE_TYPES = { planned: 'planned stock', extra: 'extra stock', production: 'event production', tasting: 'food tasting' };
const ROLES = {
  INVENTORY_CONTROL_ACCOUNT: 'inventory asset',
  INVENTORY_WIP_ACCOUNT: 'production WIP',
  INVENTORY_COGS_ACCOUNT: 'cost of goods sold',
  TASTING_HOLDING_ACCOUNT: 'tastings awaiting event outcome',
};

// Resolves one stock mapping; a missing route keeps which role, category, branch and issue type failed.
export function resolveStockBinding(bindings, key, sample, mapping) {
  try { return resolveAccountBinding(bindings, key, sample); }
  catch (error) {
    if (/^Missing account mapping/.test(error.message)) error.mapping = { key, ...mapping };
    throw error;
  }
}

export function missingMappingText(m, names = {}) {
  const issue = m.issue_type ? `, ${ISSUE_TYPES[m.issue_type] || m.issue_type}` : '';
  return `No ${ROLES[m.key] || m.key} account mapped for category "${names.category || m.category || 'unknown'}" at ${names.branch || 'this branch'}${issue}. Add it in Finance › Mapping Accounts › Inventory, then retry.`;
}

// Rewrites a missing-mapping error with the category and branch names.
export async function describeMissingMapping(db, error) {
  const m = error?.mapping;
  if (!m) return error;
  const [category, branch] = await Promise.all([
    m.category ? db.InventoryCategory.get(m.category).catch(() => null) : null,
    m.branch_id ? db.Branch.get(m.branch_id).catch(() => null) : null,
  ]);
  error.message = missingMappingText(m, { category: category?.name, branch: branch?.name });
  return error;
}