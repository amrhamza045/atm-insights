import test from 'node:test';
import assert from 'node:assert/strict';
import { averagePurchaseCost, costOrEntered } from './inventoryAverageCost.js';
import { movementRow, recordMovements } from './inventoryMovements.js';

const inv = (status, items) => ({ status, items });

test('matches the Average Prices page: plain mean of line prices for the purchase unit type', () => {
  const item = { id: 'rice', purchase_unit: 'weight', cost_per_unit: 30 };
  const invoices = [
    inv('posted', [{ inventory_item_id: 'rice', unit_type: 'weight', purchase_price: 40, quantity: 100 }]),
    inv(undefined, [{ inventory_item_id: 'rice', unit_type: 'weight', purchase_price: 50, quantity: 1 }]),
    inv('posted', [{ inventory_item_id: 'other', unit_type: 'weight', purchase_price: 999 }]),
  ];
  assert.equal(averagePurchaseCost(item, invoices), 45);
});

test('draft invoices never feed the average', () => {
  const item = { id: 'a', purchase_unit: 'pcs' };
  assert.equal(averagePurchaseCost(item, [inv('draft', [{ inventory_item_id: 'a', purchase_price: 10 }])]), null);
});

test('piece-bought items fall back to price per piece of weight lines', () => {
  const item = { id: 'chicken', purchase_unit: 'pcs' };
  const invoices = [inv('posted', [
    { inventory_item_id: 'chicken', unit_type: 'weight', purchase_price: 120, price_per_pcs: 90 },
    { inventory_item_id: 'chicken', unit_type: 'weight', purchase_price: 130, price_per_pcs: 110 },
  ])];
  assert.equal(averagePurchaseCost(item, invoices), 100);
});

test('no purchase basis keeps the entered cost', () => {
  const item = { id: 'new', purchase_unit: 'pcs', cost_per_unit: 12.5 };
  assert.equal(costOrEntered(averagePurchaseCost(item, []), item), 12.5);
});

test('movement rows carry direction, positive quantity and cost impact', () => {
  const item = { id: 'i', name: 'Oil', branch_id: 'b', cost_per_unit: 4, selling_unit_label: 'pcs', purchase_unit_label: 'pcs' };
  const row = movementRow(item, { key: 'waste:w1', direction: 'out', type: 'waste', quantity: -3, before: 10, after: 7, source_id: 'w1' });
  assert.equal(row.quantity, 3);
  assert.equal(row.cost_impact, 12);
  assert.equal(row.quantity_after, 7);
  assert.equal(row.direction, 'out');
});

test('recording is idempotent by movement key', async () => {
  const saved = [{ movement_key: 'sale:o1:i' }];
  const db = { InventoryMovement: {
    filter: async () => saved,
    bulkCreate: async (rows) => { saved.push(...rows); return rows; },
  } };
  const rows = [{ movement_key: 'sale:o1:i', quantity: 1 }, { movement_key: 'sale:o2:i', quantity: 2 }, { movement_key: 'sale:o2:i', quantity: 2 }];
  const created = await recordMovements(db, rows);
  assert.deepEqual(created.map((r) => r.movement_key), ['sale:o2:i']);
});