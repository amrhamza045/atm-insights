import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
test('both purchase documents require a nonblank supplier at storage boundary', async () => {
  for (const name of ['PurchaseOrder', 'PurchaseInvoice']) {
    const schema = JSON.parse(await read(`../entities/${name}.jsonc`));
    assert.ok(schema.required.includes('supplier_id'));
    assert.ok(schema.properties.supplier_id.minLength >= 1);
    assert.ok(schema.properties.supplier_id.pattern);
  }
});
test('cart creation cannot merge suppliers, even for an old caller', async () => {
  const source = await read('../../src/components/purchasing/cart/finalizeCart.js');
  assert.doesNotMatch(source, /mode\s*===\s*["']merge["']/);
  assert.match(source, /const groups = supplierGroups/);
});
test('supplier validation rejects missing, inactive, mixed or category-incompatible vendors', async () => {
  const { validatePurchaseSupplier } = await import('./purchaseSingleSupplier.js');
  const calls=[];
  const entities={Supplier:{get:async id=>{calls.push(id);return {id,name:'Verified vendor',is_active:id!=='inactive',supplied_category_ids:['food']};}},InventoryItem:{filter:async()=>({items:[{id:'egg',category_id:'food'},{id:'milk',category_id:'dairy'}]})}};
  await assert.rejects(validatePurchaseSupplier(entities,{supplier_id:'',items:[{inventory_item_id:'egg'}]}), /one supplier/i);
  assert.equal(calls.length,0);
  await assert.rejects(validatePurchaseSupplier(entities,{supplier_id:'inactive',items:[{inventory_item_id:'egg'}]}), /inactive/i);
  await assert.rejects(validatePurchaseSupplier(entities,{supplier_id:'vendor',items:[{inventory_item_id:'egg',supplier_id:'other'}]}), /one supplier/i);
  await assert.rejects(validatePurchaseSupplier(entities,{supplier_id:'vendor',items:[{inventory_item_id:'milk'}]}), /category/i);
  const supplier=await validatePurchaseSupplier(entities,{supplier_id:'vendor',items:[{inventory_item_id:'egg'}]});
  assert.equal(supplier.name,'Verified vendor');
});
test('invoice creation and posting both validate supplier before any write', async()=>{
  const source=await read('../functions/processPurchaseInvoice/entry.ts');
  assert.ok(source.indexOf('validatePurchaseSupplier(base44.entities, invoiceData)') < source.indexOf('PurchaseInvoice.create'));
  const post=source.slice(source.indexOf('async function postInvoice'));
  assert.ok(post.indexOf('validatePurchaseSupplier(base44.entities, invoiceData)')>=0);
  assert.ok(post.indexOf('validatePurchaseSupplier(base44.entities, invoiceData)')<post.indexOf('PurchaseInvoice.update'));
});