import test from 'node:test';
import assert from 'node:assert/strict';
import { HEALTH_SOURCES,sourceHealthQuery,mergeSourceHealth } from './financeHealthSources.js';
import { healthPostingPath } from './financeHealthPostingPaths.js';
import { journalHealth } from './financeHealthJournalEvidence.js';
import { healthInventoryEvidence } from './financeHealthInventoryEvidence.js';
import { healthPostingPage } from './financeHealthPostingPage.js';

const company={id:'co',branch_ids:['b'],currency:'EGP',currency_decimals:2};
test('all operational transaction types and inventory evidence are included',()=>{
 for(const name of ['Expense','CashierPurchase','Deposit','BalanceRecharge','EmployeeBorrowing','SalaryRecord','PayrollDisbursement','WasteDeclaration','Return','ProductionOrder','KitchenReleaseSlip','CateringReconciliation','InventoryAccountingMovement'])assert.ok(HEALTH_SOURCES.some(s=>s.entity===name),name);
});
test('inventory source queries are company-scoped with a fixed UTC cutoff',()=>{
 const q=sourceHealthQuery(HEALTH_SOURCES.find(s=>s.entity==='InventoryAccountingMovement'),{branches:{branch_id:'b'},company_id:'co',from:'2026-11-01',to:'2026-11-08',cutoff:'2026-11-08T16:00:00Z'});
 assert.equal(q.company_id,'co');assert.equal(q.created_date.$lt,'2026-11-08T16:00:00Z');
});
test('existing inventory connections are distinct from their enablement',()=>{
 assert.match(healthPostingPath(company,'ProductionOrder').adapter,/Inventory/);assert.equal(healthPostingPath(company,'ProductionOrder').enabled,false);
});
test('custody-only applied stock is intentionally not a GL posting',()=>{
 assert.equal(healthInventoryEvidence(company,[{id:'m',kind:'custody_issue',status:'applied',snapshot:{items:[{inventory_item_id:'item',cost:10}]}}],[],{}).status,'not_required');
});
test('missing and prepared stock evidence never passes',()=>{
 assert.equal(healthInventoryEvidence(company,[],[],{}).status,'missing');assert.equal(healthInventoryEvidence(company,[{status:'prepared'}],[],{}).status,'unverified');
});
test('a balanced journal cannot pass with missing reporting lines',()=>{
 const j={id:'j',currency:'EGP',branch_id:'b',ledger_ready:true,analytics_version:1,total_debit:10,total_credit:10,lines:[{account_id:'a',account_code:'1',debit:10,credit:0,cost_center:'b'},{account_id:'c',account_code:'2',debit:0,credit:10,cost_center:'b'}]};
 assert.equal(journalHealth(company,j,[]).status,'reporting');
 const ledger=j.lines.map((l,i)=>({journal_id:'j',line_key:`j:${i}`,entry_date:j.entry_date,branch_id:'b',account_code:l.account_code,debit_units:l.debit*100,credit_units:l.credit*100}));assert.equal(journalHealth(company,j,ledger).status,'matched');ledger[0].debit_units=900;assert.equal(journalHealth(company,j,ledger).status,'reporting');
});
test('continuation preserves new gap counters and does not claim all batches are complete',()=>{
 const merged=mergeSourceHealth({checked:25,blocked:2,reporting:1,examples:[],samples:[]},{checked:5,total:30,blocked:3,reporting:2,examples:[],samples:[],has_more:false});assert.equal(merged.checked,30);assert.equal(merged.blocked,5);assert.equal(merged.reporting,3);
});
test('empty source scan performs only bounded reads',async()=>{
 const ctx={svc:{entities:{Expense:{count:async()=>0,filter:async(q,options)=>{assert.equal(options.limit,25);return {items:[],has_more:false};}}}}};
 const r=await healthPostingPage(ctx,company,{entity:'Expense',name:'Expenses'}, {},{});assert.equal(r.total,0);assert.equal(r.matched,0);
});