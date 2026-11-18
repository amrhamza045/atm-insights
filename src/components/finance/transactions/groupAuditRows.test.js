import test from 'node:test';
import assert from 'node:assert/strict';
import groupAuditRows from './groupAuditRows.js';
const journal={id:'op',lines:[{debit:2000,credit:0},{debit:0,credit:2000}]};
function row(entity,id,key='operational:op'){return {id,group_key:key,source_entity:entity,source_name:entity,amount:2000,journal_entries:[journal]};}
test('linked sources from separate loaded batches become one journal row',()=>{
 const groups=groupAuditRows([row('JournalEntry','op'),row('CateringPayment','payment')]);
 assert.equal(groups.length,1);assert.equal(groups[0].sources.length,2);assert.equal(groups[0].journal_entries.length,1);assert.equal(groups[0].journal_entries[0].lines.length,2);assert.equal(groups[0].amount,2000);
});
test('purchase references survive grouping behind an operational journal without duplicate orders',()=>{
 const a=row('JournalEntry','op'),b={...row('PurchaseInvoice','inv'),purchase_orders:[{id:'po',order_number:'PO-0282'}]};
 const groups=groupAuditRows([a,b,b]);assert.equal(groups.length,1);assert.deepEqual(groups[0].purchase_orders,b.purchase_orders);
});
test('distinct journals with matching amounts stay separate',()=>{
 assert.equal(groupAuditRows([row('JournalEntry','op'),row('JournalEntry','other','operational:other')]).length,2);
});
test('repeated loaded records do not duplicate source references or journal lines',()=>{
 const a=row('JournalEntry','op'),groups=groupAuditRows([a,a]);assert.equal(groups.length,1);assert.equal(groups[0].sources.length,1);assert.equal(groups[0].journal_entries.length,1);
});