import { requireValue } from './financeValidation.js';
import { financePermission, financeBranch } from './financeAccess.js';
import { inventoryDate } from './inventoryAccountingContext.js';
import { inventoryPlan } from './inventoryAccountingPosting.js';

// Read-only: the WIP → finished goods journal a completed production would post with
// today's mappings, built from its recorded ingredients and output. Nothing is saved.
export async function previewProductionPosting(ctx, company, input) {
  financePermission(ctx, 'finance_journal_approve');
  const db = ctx.svc.entities, order = await db.ProductionOrder.get(input.production_order_id);
  financeBranch(ctx, company, order.branch_id);
  requireValue(order.status === 'completed' && order.ingredients_consumed?.length && Number(order.actual_output_quantity) > 0, 'Choose a completed production with recorded ingredients and output.');
  const ids = [order.output_item_id, ...order.ingredients_consumed.map((i) => i.inventory_item_id)];
  const page = await db.InventoryItem.filter({ id: { $in: ids } }, { limit: 200 });
  const category = (id) => page.items.find((i) => i.id === id)?.category_id;
  const inputs = order.ingredients_consumed.map((i) => ({ inventory_item_id: i.inventory_item_id, category_id: category(i.inventory_item_id), quantity: i.stock_quantity_consumed ?? i.quantity_consumed, unit: i.stock_unit || i.unit, cost: Number(i.cost) || 0 }));
  const cost = Math.round(inputs.reduce((sum, i) => sum + i.cost, 0) * 10000) / 10000;
  const output = { inventory_item_id: order.output_item_id, category_id: category(order.output_item_id), quantity: Number(order.actual_output_quantity), cost };
  const movement = { kind: 'production', branch_id: order.branch_id, entry_date: await inventoryDate(db), currency: company.currency, snapshot: { inputs, output } };
  const plan = await inventoryPlan(ctx, company, movement);
  return {
    production: { id: order.id, name: order.recipe_name, cost },
    stock_accounting_enabled: !!company.module_policy?.inventory?.enabled,
    lines: plan.lines.map((l) => ({ account: [l.account_code, l.account_name].filter(Boolean).join(' ') || l.account_id, debit: l.debit, credit: l.credit })),
  };
}