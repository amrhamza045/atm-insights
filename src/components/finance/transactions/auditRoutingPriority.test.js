import test from 'node:test';
import assert from 'node:assert/strict';
import auditRoutingPriority from './auditRoutingPriority.js';
const b={id:'binding',mapping_key:'CUSTOMER_ADVANCE_ACC',priority:100,effective_from:'2026-11-04',effective_to:'',conditions:{}};
test('branch-specific routing avoids existing global priority 100',()=>{
 const p=auditRoutingPriority([b],b.mapping_key,'2026-11-04',{branch_id:'b'});assert.equal(p.priority,101);assert.equal(p.overlaps.length,1);
});
test('cash and instapay conditions do not conflict',()=>{
 const p=auditRoutingPriority([{...b,mapping_key:'PAYMENT_METHOD_ACC',conditions:{payment_method:'cash'}}],'PAYMENT_METHOD_ACC','2026-11-04',{branch_id:'b',payment_method:'instapay'});assert.equal(p.priority,100);assert.equal(p.overlaps.length,0);
});
test('different branches and expired bindings do not force higher priority',()=>{
 assert.equal(auditRoutingPriority([{...b,conditions:{branch_id:'other'}}],b.mapping_key,'2026-11-04',{branch_id:'b'}).priority,100);
 assert.equal(auditRoutingPriority([{...b,effective_to:'2026-11-03'}],b.mapping_key,'2026-11-04',{branch_id:'b'}).priority,100);
});
test('future overlapping routing is included for an open-ended new binding',()=>{
 assert.equal(auditRoutingPriority([{...b,effective_from:'2027-01-01',priority:300}],b.mapping_key,'2026-11-04',{branch_id:'b'}).priority,301);
});
test('maximum priority cannot silently overflow or change existing bindings',()=>{
 const bindings=[{...b,priority:1000}],before=JSON.stringify(bindings);assert.equal(auditRoutingPriority(bindings,b.mapping_key,'2026-11-04',{branch_id:'b'}).priority,null);assert.equal(JSON.stringify(bindings),before);
});
test('unrelated keys are ignored',()=>{assert.equal(auditRoutingPriority([b],'Cancellation_Customer','2026-11-04',{branch_id:'b'}).overlaps.length,0);});
test('an effective end date excludes later routing',()=>{assert.equal(auditRoutingPriority([{...b,effective_from:'2027-01-01'}],b.mapping_key,'2026-11-04',{},'2026-12-31').overlaps.length,0);});