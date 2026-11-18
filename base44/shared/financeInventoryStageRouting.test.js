import test from 'node:test';
import assert from 'node:assert/strict';
import { financeBindings } from './financeBindings.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { inventoryJournal } from './inventoryAccountingRules.js';
const key='INVENTORY_CONTROL_ACCOUNT';
const data={mapping_key:key,inventory_stage:'raw',conditions:{category:'grocery'},priority:100,effective_from:'2026-11-08',account_id:'asset'};
function fixture(peers=[]){
 const saved=[];
 const entity={filter:async()=>({items:peers,has_more:false}),create:async d=>{saved.push(d);return d;}};
 const ctx={admin:true,permissions:{},svc:{entities:{FinanceAccountBinding:entity,FinanceAccount:{get:async()=>({id:'asset',company_id:'company',classification:'assets',active:true,posting:true,management_mapping:true})},InventoryCategory:{get:async()=>({id:'grocery',is_active:true})}}}};
 return {ctx,company:{id:'company',branch_ids:[]},saved};
}
test('same category and priority can have one routing per inventory type',async()=>{
 const peers=[{...data,id:'raw'}],f=fixture(peers);
 for(const inventory_stage of ['semi_finished','finished']){
  const result=await financeBindings(f.ctx,f.company,{action:'mapping_binding_save',data:{...data,inventory_stage}});
  assert.equal(result.binding.inventory_stage,inventory_stage);peers.push(result.binding);
 }
 assert.equal(f.saved.length,2);
});
test('duplicate routing for the same inventory type still conflicts',async()=>{
 const f=fixture([{...data,id:'raw'}]);
 await assert.rejects(financeBindings(f.ctx,f.company,{action:'mapping_binding_save',data}),/overlaps/);
 assert.equal(f.saved.length,0);
});
test('legacy untyped routes remain conflicts rather than silently overlapping',async()=>{
 const f=fixture([{...data,id:'legacy',inventory_stage:undefined}]);
 await assert.rejects(financeBindings(f.ctx,f.company,{action:'mapping_binding_save',data:{...data,inventory_stage:'finished'}}),/overlaps/);
});
test('posting chooses the matching inventory type within the same category',()=>{
 const bindings=['raw','semi_finished','finished'].map(stage=>({...data,id:stage,inventory_stage:stage,account_id:stage}));
 for(const inventory_stage of ['raw','semi_finished','finished'])assert.equal(resolveAccountBinding(bindings,key,{date:'2026-11-08',dimensions:{category:'grocery',inventory_stage}}).account_id,inventory_stage);
 assert.throws(()=>resolveAccountBinding(bindings,key,{date:'2026-11-08',dimensions:{category:'grocery'}}),/Ambiguous/);
});
test('same-category raw, intermediate and finished items use their actual recipe relationships',async()=>{
 const bindings=['raw','semi_finished','finished'].map(stage=>({...data,id:stage,inventory_stage:stage}));
 const recipes=[{output_item_id:'sauce'},{output_item_id:'meal',menu_item_id:'menu',ingredients:[{inventory_item_id:'sauce'}]},{output_item_id:'standalone'}];
 const db={Recipe:{filter:async query=>({items:query.output_item_id?recipes:recipes.filter(r=>r.ingredients),has_more:false})}};
 const items=['flour','sauce','meal','standalone'].map(inventory_item_id=>({inventory_item_id,category_id:'grocery'}));
 const typed=await inventoryItemStages(db,bindings,items,{date:'2026-11-08',dimensions:{}});
 assert.deepEqual(typed.map(i=>i.inventory_stage),['raw','semi_finished','finished','finished']);
 assert.ok(items.every(i=>!i.inventory_stage));
});
test('legacy single-type category routing needs no new recipe lookup',async()=>{
 const items=[{inventory_item_id:'meal',category_id:'grocery'}];
 assert.equal(await inventoryItemStages({},[{...data,id:'legacy'}],items,{date:'2026-11-08',dimensions:{}}),items);
});
test('production routes shared-category raw and semi inputs into finished inventory without ambiguity',()=>{
 const controls=['raw','semi_finished','finished'].map(stage=>({...data,id:stage,inventory_stage:stage,account_id:stage}));
 const rest=['INVENTORY_WIP_ACCOUNT','INVENTORY_COGS_ACCOUNT'].map(mapping_key=>({...data,id:mapping_key,mapping_key,account_id:mapping_key}));
 const movement={kind:'production',branch_id:'branch',entry_date:'2026-11-08',currency:'EGP',snapshot:{inputs:[{inventory_item_id:'flour',category_id:'grocery',inventory_stage:'raw',quantity:1,cost:30},{inventory_item_id:'sauce',category_id:'grocery',inventory_stage:'semi_finished',quantity:1,cost:20}],output:{inventory_item_id:'meal',category_id:'grocery',inventory_stage:'finished',quantity:1,cost:50}}};
 const plan=inventoryJournal({currency:'EGP',currency_decimals:2},movement,[...controls,...rest]);
 assert.equal(plan.lines.find(l=>l.account_id==='raw').credit,30);
 assert.equal(plan.lines.find(l=>l.account_id==='semi_finished').credit,20);
 assert.equal(plan.lines.find(l=>l.account_id==='finished').debit,50);
 assert.equal(plan.lines.reduce((sum,l)=>sum+l.debit-l.credit,0),0);
});