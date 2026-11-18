import test from 'node:test';
import assert from 'node:assert/strict';
import { runModuleJob } from './financeModuleJob.js';
import { configureModules } from './financeModulePosting.js';
import { MODULE_ACCOUNTS } from './financeModuleRules.js';
import { auditCateringPayment } from './cateringPaymentAudit.js';
import { healthSetupTasks,healthSetupChecks } from './financeHealthSetup.js';
import { varianceTargets } from './financeVarianceAccess.js';
import { payrollPosition } from './financePayrollPosition.js';
function fixture(is_test=true){
 const company={id:'company',is_test,is_active:true,branch_ids:['branch'],currency:'EGP',currency_decimals:2,edition:'fnb',write_token:'',module_policy:{enabled:true,from:'2026-11-01',map:{inventory:'inventory',suppliers:'suppliers',cash:'cash',sales:'sales'}}};
 const invoice={id:'invoice',branch_id:'branch',status:'posted',supplier_id:'supplier',invoice_date:'2026-11-05',total_amount:100,items:[{inventory_item_id:'stock',quantity:1,purchase_price:100,total_cost:100}],updated_date:'v1'};
 const order={id:'order',branch_id:'branch',status:'paid',payment_method:'cash',total:100,updated_date:'v1'};
 const accounts=[['inventory','120100'],['suppliers','210100'],['cash','110100'],['sales','410100']].map(([id,code])=>({id,code,name:id,active:true,posting:true,management_mapping:'mapped'})),journals=[],index=[],audit=[],queries=[];
 const e={
  FinanceCompany:{filter:async q=>{queries.push(q);return {items:q.is_test===false&&is_test?[]:[company]};},get:async()=>company,updateMany:async(q,d)=>{if(q.write_token===company.write_token)Object.assign(company,d.$set);},count:async()=>0,update:async(id,d)=>Object.assign(company,d)},
  PurchaseInvoice:{get:async()=>invoice},Order:{get:async()=>order},JournalEntry:{count:async()=>0},
  FinanceAccountBinding:{filter:async()=>({items:[]}),aggregate:async()=>({rows:[]})},
  FinancePaymentMethod:{filter:async()=>({items:[{id:'method',company_id:'company',code:'cash',name:'Cash',account_id:'cash',is_active:true,is_default:true,updated_date:'v1'}]})},
  FinanceJournal:{filter:async()=>({items:journals}),create:async d=>{const j={id:'journal',...d};journals.push(j);return j;},update:async(id,d)=>Object.assign(journals[0],d)},
  FinanceAccount:{filter:async q=>({items:accounts.filter(a=>q.id.$in.includes(a.id))})},FinanceProposal:{count:async()=>0},
  FinanceLedgerLine:{upsert:async rows=>index.push(...rows)},FinancePostingIssue:{upsert:async()=>{},updateMany:async()=>{}},AuditLog:{create:async()=>{}},
  FinanceAuditEvent:{create:async d=>audit.push(d)},Branch:{get:async id=>({id,name:id})},
  SystemSettings:{filter:async()=>[{timezone_offset_minutes:120}]},
  SalaryRecord:{filter:async()=>({items:[]}),aggregate:async()=>({rows:[]}),count:async()=>0}
 };
 const ctx={admin:true,permissions:{},user:{id:'admin',email:'admin@example.test'},svc:{entities:e},base44:{asServiceRole:{entities:e}}};
 return {company,invoice,order,accounts,journals,index,audit,queries,ctx,e};
}
for(const source_entity of ['Order','PurchaseInvoice'])test(`${source_entity}: test companies follow the same posting and duplicate checks as production`,async()=>{
 for(const is_test of [true,false]){
  const f=fixture(is_test),result=await runModuleJob(f.ctx,{source_entity,source_id:source_entity==='Order'?'order':'invoice',entry_date:'2026-11-05',confirmed_paid:true});
  assert.equal(result.posted,true);assert.equal(f.journals[0].is_test,is_test);assert.equal(f.index.length,2);
  const again=await runModuleJob(f.ctx,{source_entity,source_id:source_entity==='Order'?'order':'invoice',entry_date:'2026-11-05',confirmed_paid:true});assert.equal(again.already_posted,true);assert.equal(f.journals.length,1);
 }
});
test('catering payment audit includes test companies',async()=>{
 const f=fixture();await auditCateringPayment(f.ctx.base44,f.ctx.user,{id:'event',branch_id:'branch',event_name:'Event'},{status:'pending'},{id:'payment',payment_type:'refund',amount:100,status:'completed'},'approve','payment_approved');
 assert.equal(f.audit.length,1);assert.equal(f.audit[0].company_id,'company');
});
test('branch ownership checks run in both environments and include all enabled owners',async()=>{
 for(const is_test of [true,false]){
  const f=fixture(is_test),map={};f.accounts.splice(0);for(const [role,classification] of Object.entries(MODULE_ACCOUNTS)){map[role]=role;f.accounts.push({id:role,code:['cash','bank'].includes(role)?'110100':'210100',classification,management_mapping:'mapped',active:true,posting:true});}
  let checked=false;f.e.FinanceCompany.count=async q=>{checked=true;assert.equal(q.is_test,undefined);return 1;};
  await assert.rejects(()=>configureModules(f.ctx,f.company,{enabled:true,confirmed:true,from:'2026-11-01',map}),/Another enabled company/);assert.equal(checked,true);
 }
});
test('financial health applies ownership and automation assurance checks equally',async()=>{
 const f=fixture();f.e.FinanceCompany.count=async q=>{assert.equal(q.is_test,undefined);return 0;};
 await healthSetupTasks(f.ctx,f.company,{branches:{},from:'2026-11-01',to:'2026-11-05'}).find(([key])=>key==='ownership')[1]();
 const a=healthSetupChecks(f.company,{ownership:{value:0}}),b=healthSetupChecks({...f.company,is_test:false},{ownership:{value:0}});
 assert.equal(a.find(c=>c.id==='ownership').status,'Pass');assert.equal(a.find(c=>c.id==='production-context').status,b.find(c=>c.id==='production-context').status);
});
test('explicitly selected test branches are eligible for configured alerts',async()=>{
 const f=fixture();f.company.branch_ids=['branch','branch-two'];const r=await varianceTargets(f.ctx,[{type:'branch',company_id:'company',branch_id:'branch'},{type:'branch',company_id:'company',branch_id:'branch-two'}]);assert.equal(r.targets.length,2);
});
test('EGP payroll reporting is available for authorized test-company users',async()=>{
 const f=fixture();const r=await payrollPosition(f.ctx,f.company,{from:'2026-11-01',to:'2026-11-05'});assert.equal(r.summary.records,0);assert.equal(r.currency,'EGP');
});