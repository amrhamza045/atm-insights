import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryFixture } from './inventoryAccountingFixture.js';
import { inventoryPlan,postInventoryMovement } from './inventoryAccountingPosting.js';
import { assertUnusedBinding } from './financeBindingHistory.js';
import { captureDeliveryInventory } from './inventoryDeliveryCapture.js';
test('production journals use captured accounts and project to the ledger exactly once',async()=>{
 const f=inventoryFixture(),m=f.movement;m.snapshot.plan=await inventoryPlan(f.ctx,f.company,m);m.binding_ids=m.snapshot.plan.mapping_bindings.map(b=>b.binding_id);
 const first=await postInventoryMovement(f.ctx,f.company,m);assert.ok(first.posted);assert.equal(f.tables.FinanceJournal.length,1);assert.equal(f.tables.FinanceJournal[0].total_debit,f.tables.FinanceJournal[0].total_credit);
 f.bindings[0].account_id='changed-after-capture';
 const again=await postInventoryMovement(f.ctx,f.company,m);assert.ok(again.already_posted);assert.equal(f.tables.FinanceJournal.length,1);assert.equal(f.tables.FinanceLedgerLine.length,f.tables.FinanceJournal[0].lines.length);
 await assert.rejects(assertUnusedBinding(f.ctx,f.company,{id:'binding-0'}),/Historical or pending/);
});
test('prepared stock and closed periods do not generate journals',async()=>{
 const f=inventoryFixture();let result=await postInventoryMovement(f.ctx,f.company,{...f.movement,status:'prepared'});assert.ok(result.blocked);assert.equal(f.tables.FinanceJournal,undefined);
 f.company.closed_through='2026-11-08';result=await postInventoryMovement(f.ctx,f.company,f.movement);assert.ok(result.blocked);assert.equal(f.tables.FinanceJournal.length,0);
});
test('COGS is withheld until configured delivery and sale plus delivery cannot double-post',async()=>{
 const f=inventoryFixture(),order={id:'sale',status:'paid',order_type:'delivery',delivery_status:'in_delivery',items:[{menu_item_id:'menu',quantity:2}],total:999};f.entities.Order.rows.push(order);
 const m={...f.movement,id:'sale-movement',source_entity:'Order',source_id:'sale',kind:'sale',recognition:'delivery',snapshot:{items:[{inventory_item_id:'meal',category_id:'finished',quantity:2,cost:10}],source_items:JSON.stringify(order.items)}};
 m.snapshot.plan=await inventoryPlan(f.ctx,f.company,m);f.entities.InventoryAccountingMovement.rows.push(m);
 assert.ok((await postInventoryMovement(f.ctx,f.company,m)).waiting);assert.equal(f.tables.FinanceJournal,undefined);
 order.delivery_status='delivered';order.delivery_delivered_at='2026-11-09T12:00:00Z';
 assert.ok((await postInventoryMovement(f.ctx,f.company,m)).posted);assert.equal(f.tables.FinanceJournal[0].entry_date,'2026-11-09');assert.equal(f.tables.FinanceJournal[0].total_debit,10);
 order.status='completed';assert.ok((await postInventoryMovement(f.ctx,f.company,m)).already_posted);assert.equal(f.tables.FinanceJournal.length,1);
});
test('wrong COGS classifications fail before stock evidence is accepted',async()=>{
 const f=inventoryFixture();f.entities.FinanceAccount.rows[2].classification='assets';
 await assert.rejects(inventoryPlan(f.ctx,f.company,{...f.movement,kind:'sale',snapshot:{items:[{inventory_item_id:'meal',category_id:'finished',quantity:1,cost:5}]}}),/classifications/);
});
test('catering delivery uses original batch cost, caps quantity and reuses a captured handover',async()=>{
 const f=inventoryFixture();f.movement.source_id='batch';f.movement.snapshot.plan=await inventoryPlan(f.ctx,f.company,f.movement);
 f.entities.CateringTrip.rows.push({id:'trip',branch_id:'branch',event_id:'event',stage:'arrived',checklist:[{source:'production',ref_id:'batch',item_key:'production:batch',quantity:10}]});
 const cp={id:'checkpoint',branch_id:'branch',event_id:'event',trip_id:'trip',stage:'delivered',confirmed_at:'2026-11-08T12:00:00Z',item_details:[{item_key:'production:batch',actual_quantity:3,unit:'pcs'}]};
 const movements=await captureDeliveryInventory(f.ctx,f.company,cp);assert.equal(movements[0].amount,15);assert.equal(movements[0].quantity,3);
 const repeated=await captureDeliveryInventory(f.ctx,f.company,cp);assert.equal(repeated[0].id,movements[0].id);
 await assert.rejects(captureDeliveryInventory(f.ctx,f.company,{...cp,id:'second',item_details:[{...cp.item_details[0],actual_quantity:8}]}),/remaining quantity/);
});