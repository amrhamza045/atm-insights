import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTransactionRouting } from './financeTransactionRouting.js';
import { recoverTransaction } from './financeTransactionRecovery.js';
import { inspectTransactionAudit } from './financeTransactionAudit.js';
function fixture(){
 const company={id:'company',branch_ids:['branch'],currency:'EGP',currency_decimals:2,edition:'fnb'};
 const payment={id:'payment',branch_id:'branch',event_id:'event',client_id:'client',payment_method:'instapay',payment_type:'penalty',status:'completed',amount:2000,payment_date:'2026-11-04T12:00:00Z',updated_date:'v1'};
 const source={id:'operational',branch_id:'branch',posted:true,reference_type:'catering_payment',reference_id:'payment',entry_date:payment.payment_date,updated_date:'v1',entries:[{gl_account_id:'cash',debit:2000,credit:0},{gl_account_id:'revenue',debit:0,credit:2000}]};
 const bindings=[['CUSTOMER_ADVANCE_ACC','advance'],['Cancellation_Customer','revenue']].map(([mapping_key,account_id])=>({id:mapping_key,company_id:company.id,mapping_key,account_id,conditions:{},priority:100,effective_from:'2026-11-04',effective_to:''}));
 const accounts=[['advance','211100'],['revenue','410800']].map(([id,code])=>({id,code,name:id,company_id:company.id,active:true,posting:true,management_mapping:'mapped'})),journals=[],index=[],audit=[];
 const entities={
  FinancePaymentMethod:{count:async q=>['cash','instapay'].includes(q.code)?1:0,filter:async()=>({items:[]})},
  CateringPayment:{get:async()=>payment,filter:async()=>({items:[payment]})},CateringEvent:{get:async()=>({id:'event',branch_id:'branch',client_id:'client'})},
  JournalEntry:{get:async()=>source,count:async()=>1,filter:async()=>({items:[source]})},
  FinanceAccountBinding:{filter:async q=>({items:bindings.filter(b=>typeof q.mapping_key==='string'?b.mapping_key===q.mapping_key:q.mapping_key.$in.includes(b.mapping_key))}),create:async b=>{const row={id:'new',...b};bindings.push(row);return row;}},
  FinanceAccount:{get:async id=>accounts.find(a=>a.id===id),filter:async q=>({items:accounts.filter(a=>q.id.$in.includes(a.id))})},
  FinanceJournal:{filter:async q=>({items:journals.filter(j=>!q.$or||q.$or.some(c=>c.posting_key===j.posting_key||c.source_entity===j.source_entity&&c.source_id===j.source_id))}),get:async id=>journals.find(j=>j.id===id),create:async j=>{const row={id:'journal',...j};journals.push(row);return row;},update:async(id,d)=>Object.assign(journals.find(j=>j.id===id),d)},
  FinanceProposal:{filter:async()=>({items:[]}),count:async()=>0},
  FinanceLedgerLine:{filter:async()=>({items:index}),upsert:async rows=>{index.splice(0,index.length,...rows);}},
  FinancePostingIssue:{updateMany:async()=>({})},FinanceAuditEvent:{create:async e=>{audit.push(e);return e;}}
 };
 const ctx={admin:true,permissions:{},user:{id:'reviewer',email:'reviewer@example.test'},svc:{entities},base44:{asServiceRole:{entities}}};
 const input={source_entity:'CateringPayment',source_id:'payment',confirmed:true,data:{mapping_key:'Cancellation_Customer',account_id:'revenue',effective_from:'2026-11-04',effective_to:'',priority:102,conditions:{branch_id:'branch'}}};
 return {ctx,company,input,bindings,journals,index,audit,payment};
}
test('future routing can be configured from an already posted source without altering its journal',async()=>{
 const f=fixture();f.journals.push({id:'existing',status:'posted',ledger_ready:true,source_entity:'JournalEntry',source_id:'operational'});const before=structuredClone(f.journals);
 const result=await saveTransactionRouting(f.ctx,f.company,f.input);assert.equal(result.reused,true);assert.deepEqual(f.journals,before);assert.equal(result.preview,null);
});
test('a rule for a different method saves for future payments without claiming to repair this source',async()=>{
 const f=fixture();f.input.data.conditions={payment_method:'cash'};const r=await saveTransactionRouting(f.ctx,f.company,f.input);assert.equal(r.matches_source,false);assert.equal(f.journals.length,0);
});
test('new conditions, dates, priority and notes persist and drive the live posting preview',async()=>{
 const f=fixture();f.bindings.splice(1,1);Object.assign(f.input.data,{conditions:{branch_id:'branch',currency:'EGP',payment_type:'penalty',payment_method:'instapay'},effective_to:'2026-12-31',priority:321,notes:'Future retained cancellation routing'});
 const r=await saveTransactionRouting(f.ctx,f.company,f.input);assert.equal(r.matches_source,true);assert.deepEqual(r.binding.conditions,f.input.data.conditions);assert.equal(r.binding.priority,321);assert.equal(r.binding.effective_to,'2026-12-31');assert.equal(r.binding.notes,f.input.data.notes);assert.ok(r.preview);assert.equal(f.journals.length,0);
});
test('saving existing routing returns a source-specific journal preview, without duplication or posting',async()=>{
 const f=fixture(),r=await saveTransactionRouting(f.ctx,f.company,f.input);
 assert.equal(r.reused,true);assert.equal(f.bindings.length,2);assert.equal(f.journals.length,0);assert.equal(r.preview.source_id,'payment');assert.equal(r.preview.target_id,'operational');
});
test('confirming the returned preview posts one journal and links it from payment and operational transaction',async()=>{
 const f=fixture(),saved=await saveTransactionRouting(f.ctx,f.company,f.input);
 const posted=await recoverTransaction(f.ctx,f.company,{...f.input,reason:'Verified retained customer advance',preview_token:saved.preview.token});
 assert.equal(posted.verified,true);assert.equal(posted.source_id,'payment');assert.equal(f.journals.length,1);assert.equal(f.bindings.length,2);assert.equal(f.index.length,2);
 for(const [source_entity,source_id] of [['CateringPayment','payment'],['JournalEntry','operational']]){const detail=await inspectTransactionAudit(f.ctx,f.company,{source_entity,source_id});assert.equal(detail.journals[0].id,posted.journal_id);}
 await assert.rejects(()=>recoverTransaction(f.ctx,f.company,{...f.input,reason:'Retry',preview_token:saved.preview.token}),/already represents/);assert.equal(f.journals.length,1);
});