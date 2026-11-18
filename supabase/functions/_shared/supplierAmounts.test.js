import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierAmount, supplierSettlement, supplierOpeningAllowed, supplierInvoiceTotal } from './supplierAmounts.js';
test('full, partial and credit balances reconcile in cents', () => {
  assert.deepEqual(supplierSettlement(100,0), {paid:0,outstanding:100,status:'unpaid'});
  assert.deepEqual(supplierSettlement(100,40), {paid:40,outstanding:60,status:'partial'});
  assert.deepEqual(supplierSettlement(100,100), {paid:100,outstanding:0,status:'paid'});
  assert.equal(supplierSettlement(0.3,0.1).outstanding,0.2);
});
test('invoice payable must reconcile to the recorded item costs', () => {
  assert.equal(supplierInvoiceTotal({total_amount:100,items:[{total_cost:40},{total_cost:60}]}),100);
  assert.throws(()=>supplierInvoiceTotal({total_amount:100,items:[{total_cost:99}]}));
});
test('reject invalid money and overpayment', () => {
  for (const n of [-1,NaN,Infinity,0.001]) assert.throws(()=>supplierAmount(n));
  assert.throws(()=>supplierAmount(0,true));
  assert.throws(()=>supplierSettlement(10,11));
});
test('opening balances exclude old invoices rather than counting them twice', () => {
  assert.equal(supplierOpeningAllowed('2026-10-31','2026-10-31'),false);
  assert.equal(supplierOpeningAllowed('2026-10-31','2026-10-30'),false);
  assert.equal(supplierOpeningAllowed('2026-10-31','2026-11-01'),true);
  assert.equal(supplierOpeningAllowed('','2026-10-30'),true);
});