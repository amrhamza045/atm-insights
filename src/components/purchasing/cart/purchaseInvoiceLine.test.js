import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import purchaseInvoiceLine from './purchaseInvoiceLine.js';
const schema=JSON.parse(await readFile(new URL('../../../../base44/entities/PurchaseInvoice.jsonc',import.meta.url),'utf8'));
const lineSchema=schema.properties.items.items;
const input={line:{inventory_item_id:'eggs',inventory_item_name:'بيض'},item:{category_id:'grocery'},quantity:10,price:6.5,unit:'pcs',isWeight:false};
function check(line){
 for(const key of lineSchema.required)assert.ok(key in line,`${key} is required`);
 for(const [key,value] of Object.entries(line)){
  const field=lineSchema.properties[key];if(!field)continue;
  if(field.type==='number')assert.ok(typeof value==='number'&&Number.isFinite(value),`${key} must be numeric`);
  if(field.format==='date')assert.match(value,/^\d{4}-\d{2}-\d{2}$/,`${key} must be omitted when blank`);
 }
}
test('the affected 10 eggs at 6.5 invoice satisfies the actual invoice schema',()=>{
 const line=purchaseInvoiceLine(input);check(line);assert.equal(line.total_cost,65);assert.equal(line.price_per_pcs,6.5);assert.ok(!('pieces_count' in line));assert.ok(!('expiry_date' in line));
});
test('weight-based receipts keep required pricing numeric without inventing a piece count',()=>{
 const line=purchaseInvoiceLine({...input,quantity:2.5,price:40,unit:'kg',isWeight:true});check(line);assert.equal(line.total_cost,100);assert.equal(line.price_per_pcs,0);assert.ok(!('pieces_count' in line));
});
test('valid optional expiry dates are preserved',()=>{
 const line=purchaseInvoiceLine({...input,expiryDate:'2026-12-01'});check(line);assert.equal(line.expiry_date,'2026-12-01');
});
test('box quantities remain in purchase units for server conversion',()=>{
 const line=purchaseInvoiceLine({...input,quantity:2,price:30,unit:'box'});check(line);assert.equal(line.quantity,2);assert.equal(line.unit,'box');assert.ok(!('pieces_count' in line));
});