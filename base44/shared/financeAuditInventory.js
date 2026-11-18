import { requireValue } from './financeValidation.js';
import { INVENTORY_KEYS } from './inventoryAccountingRules.js';
import { resolveStockBinding, missingMappingText, TASTING_HOLDING_KEY } from './inventoryMappingMessages.js';
import { tastingOutcome } from './inventoryTastingSettlement.js';
import { transactionSuggestion } from './financeTransactionSources.js';

const ids = (rows, pick) => [...new Set(rows.map(pick).filter(Boolean))];
const byId = (page) => new Map(page.items.map((r) => [r.id, r]));
const none = { items: [] };

// Routing evidence for stock rows in Transaction Audit: stock mappings, waste reasons,
// linked events, and category / branch names for readable gap messages.
export async function inventoryAuditContext(ctx, company, def, sources) {
  if (!def.inventory || !sources.length) return {};
  const db = ctx.svc.entities, waste = def.entity === 'WasteDeclaration';
  const items = waste ? sources : sources.flatMap((s) => s.snapshot?.items || []);
  const reasonIds = waste ? ids(sources, (s) => s.waste_reason_id) : [], eventIds = waste ? ids(sources, (s) => s.event_id) : [];
  const categoryIds = ids(items, (i) => i.category_id), branchIds = ids(sources, (s) => s.branch_id);
  const [bindings, reasons, events, categories, branches] = await Promise.all([
    db.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: { $in: [...INVENTORY_KEYS, TASTING_HOLDING_KEY] } }, { limit: 500 }),
    reasonIds.length ? db.FinanceWasteReason.filter({ id: { $in: reasonIds } }, { limit: 100 }) : none,
    eventIds.length ? db.CateringEvent.filter({ id: { $in: eventIds } }, { limit: 100 }) : none,
    categoryIds.length ? db.InventoryCategory.filter({ id: { $in: categoryIds } }, { limit: 250 }) : none,
    branchIds.length ? db.Branch.filter({ id: { $in: branchIds } }, { limit: 100 }) : none,
  ]);
  requireValue(!bindings.has_more, 'Too many stock account mappings for a safe audit.');
  return { stockBindings: bindings.items, reasons: byId(reasons), events: byId(events), categories: byId(categories), branches: byId(branches) };
}

// Checks the routing a stock row needs today; a gap names the role, category, branch and issue type.
export function inventoryAuditMapping(company, def, s, context, date, account, result) {
  const route = (key, category, extra = {}) => {
    try {
      return resolveStockBinding(context.stockBindings || [], key, { date, dimensions: { branch_id: s.branch_id, currency: company.currency, category, ...extra } }, { category, branch_id: s.branch_id, issue_type: extra.issue_type });
    } catch (error) {
      if (error.mapping) error.message = missingMappingText(error.mapping, { category: context.categories?.get(category)?.name, branch: context.branches?.get(s.branch_id)?.name });
      throw error;
    }
  };
  if (def.entity === 'InventoryAccountingMovement') {
    for (const it of s.snapshot?.items || []) {
      account(route(INVENTORY_KEYS[0], it.category_id, it.inventory_stage ? { inventory_stage: it.inventory_stage } : {}).account_id);
      account(route(INVENTORY_KEYS[2], it.category_id, it.issue_type ? { issue_type: it.issue_type } : {}).account_id);
    }
    return result('ready', 'Stock and COGS routing is configured for every consumed category and issue type.');
  }
  const reason = context.reasons?.get(s.waste_reason_id);
  requireValue(reason, 'This waste has no configured waste reason, so it cannot post automatically.');
  account(reason.account_id);
  account(route(INVENTORY_KEYS[0], s.category_id).account_id);
  if (reason.treatment !== 'food_tasting' || !s.event_id) return result('ready', 'Waste routing is configured: the reason account and the item\'s inventory account.');
  account(route(TASTING_HOLDING_KEY, s.category_id).account_id);
  if (tastingOutcome(context.events?.get(s.event_id)) === 'cogs') account(route(INVENTORY_KEYS[2], s.category_id, { issue_type: 'tasting' }).account_id);
  return result('ready', 'Tasting routing is configured: held until the event outcome, then COGS or the reason account.');
}

export function inventorySuggestion(reason) {
  if (/mapped|mapping|account/i.test(reason)) return 'Add the missing routing in Finance › Mapping Accounts › Inventory (or the reason account in Waste reasons), then use Retry in Posting issues.';
  return transactionSuggestion(reason);
}