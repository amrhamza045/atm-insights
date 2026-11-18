import { requireValue } from './financeValidation.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { resolveStockBinding, describeMissingMapping } from './inventoryMappingMessages.js';

export const STOCK_CONTROL_KEY = 'INVENTORY_CONTROL_ACCOUNT';

// A stock item's own inventory account, by its category and stock type (raw, semi-finished,
// finished): the account all its stock movements use. Openings and returns post here too,
// so an item's value never sits in two inventory accounts.
export async function itemStockBinding(db, company, item, date) {
  const page = await db.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: STOCK_CONTROL_KEY }, { limit: 500 });
  requireValue(!page.has_more, 'Too many inventory mappings to resolve safely.');
  const sample = { date, dimensions: { branch_id: item.branch_id, currency: company.currency } };
  const [typed] = await inventoryItemStages(db, page.items, [{ inventory_item_id: item.id, category_id: item.category_id }], sample);
  const dimensions = { ...sample.dimensions, category: item.category_id, ...(typed.inventory_stage ? { inventory_stage: typed.inventory_stage } : {}) };
  try { return resolveStockBinding(page.items, STOCK_CONTROL_KEY, { ...sample, dimensions }, { category: item.category_id, branch_id: item.branch_id }); }
  catch (error) { throw await describeMissingMapping(db, error); }
}