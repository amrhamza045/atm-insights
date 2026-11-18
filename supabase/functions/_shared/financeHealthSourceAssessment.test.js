import test from 'node:test';
import assert from 'node:assert/strict';
import { assessHealthSource } from './financeHealthSourceAssessment.js';
import { healthSourceLinks } from './financeHealthPostingLinks.js';
const company={id:'co',branch_ids:['b'],currency:'EGP',currency_decimals:2,auto_post_enabled:true,auto_post_from:'2026-01-01',auto_source_currency:'EGP',auto_account_map:{cash:'a',revenue:'c'}};
const entries=[{gl_account_id:'cash',debit:10,credit:0},{gl_account_id:'revenue',debit:0,credit:10}];
const source={id:'e',branch_id:'b',amount:10,expense_date:'2026-11-08'};
const op={id:'op',reference_id:'e',branch_id:'b',entry_date:'2026-11-08',entries};
const journal={id:'j',source_entity:'JournalEntry',source_id:'op',posting_key:'co:legacy:op',branch_id:'b',currency:'EGP',ledger_ready:true,analytics_version:1,entry_date:'2026-11-08',total_debit:10,total_credit:10,source_summary:{entries},lines:entries.map((l,i)=>({account_id:i?'c':'a',account_code:i?'4':'1',debit:l.debit,credit:l.credit,cost_center:'b'}))};
function evidence(){return {ledger:journal.lines.map((l,i)=>({journal_id:'j',line_key:`j:${i}`,branch_id:'b',entry_date:'2026-11-08',account_code:l.account_code,debit_units:l.debit*100,credit_units:l.credit*100})),diagnostic:{payments:new Map(),bindings:[],methods:[],accounts:new Map(['a','c'].map(id=>[id,{id,company_id:'co',active:true,posting:true,management_mapping:'yes'}]))}};}
const def={entity:'Expense',amount:'amount',date:'expense_date'};
test('a source with posted operational evidence can reconcile without a direct adapter',()=>{
 const r=assessHealthSource(company,def,source,{ops:[op],movements:[],journals:[journal],proposals:[],issues:[]},evidence());assert.equal(r.status,'matched');assert.match(r.reporting,/Every journal line/);
});
test('pending approvals and unconnected sources are distinguished',()=>{
 const links={ops:[],movements:[],journals:[],proposals:[],issues:[]};assert.equal(assessHealthSource(company,def,source,links,evidence()).status,'missing');links.proposals=[{id:'p'}];assert.equal(assessHealthSource(company,def,source,links,evidence()).status,'pending');
});
test('a posted source with an unresolved posting issue never receives a clean pass',()=>{
 const r=assessHealthSource(company,def,source,{ops:[op],movements:[],journals:[journal],proposals:[],issues:[{message:'Review issue'}]},evidence());assert.equal(r.status,'blocked');assert.match(r.reason,/without reposting/);
});
test('multiple financial postings for one source are duplicates even with different keys',()=>{
 const r=assessHealthSource(company,def,source,{ops:[op],movements:[],journals:[journal,{...journal,id:'j2',posting_key:'other'}],proposals:[],issues:[]},evidence());assert.equal(r.status,'duplicate');
});
test('link matching finds source-linked corrections and immutable movement journals',()=>{
 const result=healthSourceLinks({entity:'ProductionOrder'},{id:'p'},{ops:[],movements:[{id:'m',source_entity:'ProductionOrder',source_id:'p'}],journals:[{id:'j',source_entity:'InventoryAccountingMovement',source_id:'m'}],proposals:[],issues:[{source_id:'m',message:'blocked'}]});assert.equal(result.journals.length,1);assert.equal(result.issues.length,1);
});