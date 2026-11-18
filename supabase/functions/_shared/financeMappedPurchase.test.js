import test from 'node:test';
import assert from 'node:assert/strict';
import { runModuleJob } from './financeModuleJob.js';
import { previewModule, postModule } from './financeModulePosting.js';
function fixture(){
 const company={id:'company',is_active:true,is_test:true,branch_ids:['branch'],currency:'EGP',currency_decimals:2,module_policy:null,write_token:''};
 const source={id:'invoice',branch_id:'branch',supplier_id:'supplier',invoice_date:'2026-11-08',status:'posted',total_amount:100,items:[{inventory_item_id:'stock',category_id:'food',quantity:2,purchase_price:50,total_cost:100}],updated_date:'v1'};
 const bindings=[['RAW_INV_ACCOUNT','inventory'],['VENDOR_AP_ACCOUNT','payables']].map(([mapping_key,account_id])=>({id:mapping_key,mapping_key,account_id,company_id:'company',effective_from:'2026-11-08',priority:100,conditions:{}}));
 const accounts=[{id:'inventory',code:'112100',name:'Inventory'},{id:'payables',code:'210100',name:'Payables'}].map(a=>({...a,active:true,posting:true,management_mapping:'mapped'}));
 const journals=[],issues=[],ledger=[];let pending=0,legacy=0;
 const entities={
  FinanceCompany:{filter:async q=>({items:q['module_policy.enabled']?[]:[company]}),get:async()=>company,updateMany:async(q,d)=>Object.assign(company,d.$set)},
  PurchaseInvoice:{get:async()=>source},
  FinanceAccountBinding:{filter:async()=>({items:bindings}),aggregate:async()=>({rows:bindings.length?[{company_id:'company'}]:[]})},
  FinanceAccount:{filter:async()=>({items:accounts})},
  FinanceJournal:{count:async()=>journals.length,filter:async()=>({items:journals}),create:async d=>{const j={id:'journal',...d};journals.push(j);return j;},update:async(id,d)=>Object.assign(journals[0],d)},
  FinanceProposal:{count:async()=>pending},JournalEntry:{count:async()=>legacy},
  FinancePostingIssue:{upsert:async rows=>issues.push(...rows),updateMany:async()=>{}},FinanceLedgerLine:{upsert:async rows=>ledger.push(...rows)},
  Branch:{get:async()=>({id:'branch',name:'Branch'})},AuditLog:{create:async()=>{}}
 };
 const ctx={admin:true,permissions:{},user:{id:'admin',email:'admin@example.test'},svc:{entities},base44:{asServiceRole:{entities}}};
 return {ctx,company,source,bindings,accounts,journals,issues,ledger,entities,setPending:n=>pending=n,setLegacy:n=>legacy=n};
}
test('mapped invoice previews through automatic company discovery without writes',async()=>{
 const f=fixture();const result=await runModuleJob(f.ctx,{source_entity:'PurchaseInvoice',source_id:'invoice',dry_run:true});
 assert.equal(result.preview,true);assert.equal(result.total_debit,100);assert.equal(result.lines[0].account_code,'112100');assert.equal(result.lines[1].account_code,'210100');assert.equal(f.journals.length,0);assert.equal(f.issues.length,0);
});
test('mapped invoice posts once and indexes the ledger without legacy configuration',async()=>{
 const f=fixture();const first=await runModuleJob(f.ctx,{source_entity:'PurchaseInvoice',source_id:'invoice'});assert.equal(first.posted,true);assert.equal(f.ledger.length,2);
 assert.equal((await runModuleJob(f.ctx,{source_entity:'PurchaseInvoice',source_id:'invoice'})).already_posted,true);assert.equal(f.journals.length,1);
 f.source.total_amount=101;assert.equal((await runModuleJob(f.ctx,{source_entity:'PurchaseInvoice',source_id:'invoice'})).blocked,true);assert.equal(f.journals.length,1);
});
for(const [name,change,pattern] of [
 ['draft',f=>f.source.status='draft',/posted invoices/],
 ['missing payable',f=>f.bindings.pop(),/VENDOR_AP_ACCOUNT/],
 ['expired mapping',f=>f.bindings[0].effective_to='2026-11-07',/RAW_INV_ACCOUNT/],
 ['future mapping',f=>f.bindings[0].effective_from='2026-11-09',/RAW_INV_ACCOUNT/],
 ['ambiguous mapping',f=>f.bindings.push({...f.bindings[0],id:'duplicate'}),/Ambiguous/],
 ['wrong branch mapping',f=>f.bindings[0].conditions={branch_id:'other'},/RAW_INV_ACCOUNT/],
 ['locked period',f=>f.company.closed_through='2026-11-08',/locked/],
 ['inactive account',f=>f.accounts[0].active=false,/active posting/],
 ['wrong account type',f=>f.accounts[0].code='410100',/inventory.*asset/i],
 ['unbalanced invoice',f=>f.source.total_amount=101,/reconcile/],
 ['existing operational journal',f=>f.setLegacy(1),/operational journal/],
 ['pending proposal',f=>f.setPending(1),/pending/]
])test(`mapped invoice rejects ${name}`,async()=>{const f=fixture();change(f);const r=await runModuleJob(f.ctx,{source_entity:'PurchaseInvoice',source_id:'invoice',dry_run:true});assert.equal(r.blocked,true);assert.match(r.message,pattern);assert.equal(f.journals.length,0);assert.equal(f.issues.length,0);});
test('invoice category selects the higher-priority inventory binding',async()=>{const f=fixture();f.bindings.push({...f.bindings[0],id:'food',account_id:'foodInventory',conditions:{category:'food'},priority:200});f.accounts.push({...f.accounts[0],id:'foodInventory',code:'112200'});const r=await previewModule(f.ctx,f.company,{source_entity:'PurchaseInvoice',source_id:'invoice'});assert.equal(r.lines[0].account_id,'foodInventory');});
test('unmapped invoice retains enabled legacy purchase connections',async()=>{const f=fixture();f.bindings.splice(0);f.company.module_policy={enabled:true,from:'2026-11-01',map:{inventory:'inventory',suppliers:'payables'}};assert.equal((await postModule(f.ctx,f.company,'PurchaseInvoice',f.source,f.source.invoice_date)).posted,true);});
test('lifecycle inventory routing resolves raw, semi-finished and finished stages without equal-priority ambiguity',async()=>{
 const f=fixture();
 f.company.module_policy={inventory:{enabled:true,from:'2026-11-08',cogs_trigger:'delivery'}};
 f.entities.Recipe={filter:async()=>({items:[],has_more:false})};
 f.accounts.push({id:'wip',code:'112300',name:'WIP',active:true,posting:true,management_mapping:'mapped'},{id:'fg',code:'112400',name:'Finished',active:true,posting:true,management_mapping:'mapped'});
 f.bindings.splice(0,f.bindings.length,
  {id:'raw',mapping_key:'INVENTORY_CONTROL_ACCOUNT',inventory_stage:'raw',account_id:'inventory',company_id:'company',effective_from:'2026-11-08',priority:100,conditions:{category:'food'}},
  {id:'semi',mapping_key:'INVENTORY_CONTROL_ACCOUNT',inventory_stage:'semi_finished',account_id:'wip',company_id:'company',effective_from:'2026-11-08',priority:100,conditions:{category:'food'}},
  {id:'fin',mapping_key:'INVENTORY_CONTROL_ACCOUNT',inventory_stage:'finished',account_id:'fg',company_id:'company',effective_from:'2026-11-08',priority:100,conditions:{category:'food'}},
  {id:'ap',mapping_key:'VENDOR_AP_ACCOUNT',account_id:'payables',company_id:'company',effective_from:'2026-11-08',priority:100,conditions:{}}
 );
 const res=await runModuleJob(f.ctx,{source_entity:'PurchaseInvoice',source_id:'invoice'});
 assert.equal(res.posted,true);
 assert.equal(f.journals[0].lines[0].account_code,'112100');
 assert.equal(f.journals[0].lines[0].debit,100);
 assert.equal(f.journals[0].lines[1].account_code,'210100');
 assert.equal(f.journals[0].lines[1].credit,100);
});