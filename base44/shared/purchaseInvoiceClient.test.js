import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEntitiesModule } from '../../node_modules/@base44/sdk/dist/modules/entities.js';
import { validatePurchaseSupplier } from './purchaseSingleSupplier.js';

test('purchase invoice runtime uses the same pagination-capable client as the app',async()=>{
 const source=await readFile(new URL('../functions/processPurchaseInvoice/entry.ts',import.meta.url),'utf8');
 const runtime=source.match(/npm:@base44\/sdk@([^'";]+)/)?.[1];
 const installed=JSON.parse(await readFile(new URL('../../node_modules/@base44/sdk/package.json',import.meta.url),'utf8')).version;
 assert.equal(runtime,installed,'The purchase runtime must support the app’s cursor-page query contract.');
});

test('supplier validation sends a bounded page query and accepts the affected eggs receipt',async()=>{
 const calls=[];
 const entities=createEntitiesModule({appId:'purchase-test',axios:{get:async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/Supplier/vendor'))return {id:'vendor',name:'Egg supplier',is_active:true,supplied_category_ids:['dairy']};
  assert.ok(url.endsWith('/InventoryItem/v2/list'));
  assert.equal(options.params.limit,500);
  assert.equal(options.params.sort,undefined);
  assert.deepEqual(JSON.parse(options.params.q),{id:{$in:['eggs']}});
  return {items:[{id:'eggs',name:'بيض',category_id:'dairy'}],has_more:false};
 }}});
 const supplier=await validatePurchaseSupplier(entities,{supplier_id:'vendor',items:[{inventory_item_id:'eggs',quantity:10,purchase_price:6.5,price_per_pcs:6.5}]});
 assert.equal(supplier.id,'vendor');assert.equal(calls.length,2);
});