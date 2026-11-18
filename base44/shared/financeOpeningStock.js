import { requireValue, moneyUnits } from './financeValidation.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { financePermission, financeBranch } from './financeAccess.js';
import { inventoryDate } from './inventoryAccountingContext.js';
import { itemStockBinding, STOCK_CONTROL_KEY as CONTROL } from './inventoryStockBinding.js';
import { computeIngredientCost, getItemStockUnit, loadConversionRules } from './unitConversion.js';
import { OPENING_EQUITY_KEY, chooseCutoff, alignOpeningEquity, findOpening, openingLines, postOpeningJournal } from './financeOpening.js';

const round4 = (n) => Math.round(n * 10000) / 10000;

// Value of a quantity in the item's stock unit at a price per the item's cost unit.
function stockValue(quantity, unit, item, unitCost, rules) {
  const c = computeIngredientCost(quantity, unit, { ...item, cost_per_unit: unitCost }, rules);
  requireValue(c.ok && Number.isFinite(c.totalCost), c.message || "This item's stock unit cannot be converted to its cost unit.");
  return c.totalCost;
}

// Adds the counted quantity once (the marker on the item stops a retry) and blends its cost into the average.
async function applyStock(db, entry, rules) {
  const item = await db.InventoryItem.get(entry.inventory_item_id);
  if (item.opening_entry_id === entry.id) return;
  const current = Number(item.quantity) || 0, before = Math.max(0, current);
  const value = (before > 0 ? stockValue(before, entry.unit, item, Number(item.cost_per_unit) || 0, rules) : 0) + entry.amount;
  const costUnits = stockValue(round4(before + entry.quantity), entry.unit, item, 1, rules);
  await db.InventoryItem.update(item.id, { quantity: round4(current + entry.quantity), cost_per_unit: round4(value / costUnits), opening_entry_id: entry.id });
}

// B01: counted stock at the cut-off, once per stock item. Dr the item's inventory account,
// Cr opening balance equity; the quantity is added to the item at its opening cost.
export async function postOpeningStock(ctx, company, input) {
  financePermission(ctx, 'finance_journal_approve');
  financeBranch(ctx, company, input.branch_id);
  const db = ctx.svc.entities, scale = 10 ** company.currency_decimals;
  const quantity = Number(input.quantity), unitCost = Number(input.unit_cost), notes = String(input.notes || '').trim();
  requireValue(quantity > 0 && unitCost > 0, 'Enter the counted quantity and its cost above zero.');
  requireValue(notes.length >= 3 && notes.length <= 500, 'Add the evidence reference, such as the stock count sheet.');
  const item = await db.InventoryItem.get(input.inventory_item_id).catch(() => null);
  requireValue(item?.branch_id === input.branch_id, 'Choose a stock item of this branch.');
  requireValue(item.category_id, 'Give this item an inventory category before entering its opening stock.');
  const rules = await loadConversionRules(db), unit = getItemStockUnit(item);
  const amount = Math.round(stockValue(quantity, unit, item, unitCost, rules) * scale) / scale;
  requireValue(moneyUnits(amount, company.currency_decimals) > 0, 'The opening value rounds to zero.');
  const { cutoff, first } = await chooseCutoff(ctx, company, input.cutoff_date);
  const entry_key = `inventory:${company.id}:${item.id}`;
  let entry = await findOpening(db, company, entry_key, (e) => e.quantity === quantity && e.unit_cost === unitCost && e.notes === notes);
  if (!entry) {
    const bindings = await alignOpeningEquity(ctx, company, cutoff, first);
    const equity = resolveAccountBinding(bindings, OPENING_EQUITY_KEY, { date: cutoff, dimensions: { branch_id: item.branch_id, currency: company.currency } });
    const stock = await itemStockBinding(db, company, item, await inventoryDate(db));
    const common = { cost_center: item.branch_id, channel: 'opening', product_category: item.category_id, product_reference: item.id };
    const raw = [{ ...common, account_id: stock.account_id, debit: amount, credit: 0 }, { ...common, account_id: equity.account_id, debit: 0, credit: amount }];
    const lines = await openingLines(ctx, company, raw, cutoff);
    entry = await db.FinanceOpeningBalance.create({
      entry_key, company_id: company.id, branch_id: item.branch_id, branch_name: item.branch_name || '', kind: 'inventory', status: 'pending', cutoff_date: cutoff, amount,
      inventory_item_id: item.id, inventory_item_name: item.name, category_id: item.category_id, quantity, unit, unit_cost: unitCost,
      before_quantity: Number(item.quantity) || 0, before_cost: Number(item.cost_per_unit) || 0, notes, actor_email: ctx.user.email,
      account_snapshot: { raw, lines, mapping_bindings: [{ key: CONTROL, binding_id: stock.id, binding_updated_date: stock.updated_date }, { key: OPENING_EQUITY_KEY, binding_id: equity.id, binding_updated_date: equity.updated_date }] },
    });
  }
  await applyStock(db, entry, rules);
  const saved = await postOpeningJournal(ctx, company, entry, `${entry.inventory_item_name} · ${entry.branch_name || entry.branch_id}`);
  return { entry: { ...saved, account_snapshot: undefined } };
}