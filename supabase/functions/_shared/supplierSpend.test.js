import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierSpend } from './supplierSpend.js';

const row = (supplier_id, kind, sum_delta) => ({ supplier_id, kind, sum_delta });

test('total spent is invoices minus supplier returns; payments stay separate', () => {
  const t = supplierSpend([
    row('doha', 'invoice', 24761.56), row('doha', 'supplier_return', -24685.56),
  ]).get('doha');
  assert.deepEqual(t, { total_invoices: 24761.56, total_returns: 24685.56, total_spent: 76, total_payments: 0, balance: 76 });
});

test('cash payments reduce the balance but not total spent', () => {
  const t = supplierSpend([
    row('s', 'invoice', 1000), row('s', 'opening', 200), row('s', 'supplier_return', -150),
    row('s', 'payment', -500), row('s', 'historical_settlement', -50),
  ]).get('s');
  assert.equal(t.total_invoices, 1200);
  assert.equal(t.total_returns, 150);
  assert.equal(t.total_spent, 1050);
  assert.equal(t.total_payments, 550);
  assert.equal(t.balance, 500);
});

test('suppliers are kept apart and cents reconcile', () => {
  const m = supplierSpend([row('a', 'invoice', 0.3), row('a', 'supplier_return', -0.1), row('b', 'payment', -5)]);
  assert.equal(m.get('a').total_spent, 0.2);
  assert.equal(m.get('b').total_spent, 0);
  assert.equal(m.get('b').balance, -5);
});