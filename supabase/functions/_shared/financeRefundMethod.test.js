import test from 'node:test';
import assert from 'node:assert/strict';
import { mappedAdvancePlan } from './financeMappedAdvance.js';
import { postFinanceSource } from './financeAutomatic.js';
import { automaticFinanceCompanies } from './financeAutomaticCompanies.js';
import { correctPaymentMethod } from './financePaymentMethodCorrection.js';
import { postPaymentVoid } from './financePaymentVoid.js';
export function fixture(type='refund',method='instapay'){
 const company={id:'company',is_test:true,currency:'EGP',currency_decimals:2,branch_ids:['branch'],auto_post_enabled:true,auto_post_from:'2026-11-04',auto_source_currency:'EGP',auto_account_map:{cash:'cash',advance:'advance'}};
 const payment={id:'payment',status:'completed',payment_type:type,payment_method:method,branch_id:'branch',event_id:'event',client_id:'client',amount:50000,payment_date:'2026-11-05T14:20:00Z',updated_date:'p1'};
 const source={id:'source',branch_id:'branch',posted:true,reference_type:type==='refund'?'catering_credit_note':type==='deposit_withdrawal'?'catering_deposit_withdrawal':'catering_payment',reference_id:payment.id,entry_date:payment.payment_date,updated_date:'s1',entries:[{gl_account_id:'advance',debit:50000,credit:0},{gl_account_id:'cash',debit:0,credit:50000}]};
 const bindings=[['CUSTOMER_ADVANCE_ACC','advance',{}],['PAYMENT_METHOD_ACC','cash',{payment_method:'cash'}],['PAYMENT_METHOD_ACC','bank',{payment_method:'instapay'}]].map(([mapping_key,account_id,conditions],i)=>({id:`binding-${i}`,mapping_key,account_id,conditions,priority:100,effective_from:'2026-11-04',updated_date:'b1'}));
 const accounts=[['advance','211100'],['cash','110100'],['bank','110300']].map(([id,code])=>({id,company_id:company.id,code,name:id,active:true,posting:true,management_mapping:'mapped'}));
 const journals=[],index=[];let issue;
 const e={CateringPayment:{get:async()=>payment},CateringEvent:{get:async()=>({id:'event',branch_id:'branch',client_id:'client'})},JournalEntry:{get:async()=>source,count:async()=>1},
 FinancePaymentMethod:{aggregate:async()=>({rows:[]})},FinanceCompany:{filter:async()=>({items:[company]})},FinanceAccountBinding:{filter:async q=>({items:bindings.filter(b=>q.mapping_key.$in.includes(b.mapping_key))}),aggregate:async()=>({rows:[{company_id:'company'}]})},
 FinanceAccount:{filter:async q=>({items:accounts.filter(a=>q.id.$in.includes(a.id))})},
 FinanceJournal:{count:async()=>0,filter:async q=>({items:journals.filter(j=>(!q.posting_key||j.posting_key===q.posting_key)&&(!q.source_entity||j.source_entity===q.source_entity)&&(!q['source_summary.reference_id']||j.source_summary?.reference_id===q['source_summary.reference_id'])&&(!q.kind||j.kind!==q.kind.$ne)&&(!q.$or||q.$or.some(c=>c.posting_key&&c.posting_key===j.posting_key||c.reversal_of&&c.reversal_of===j.reversal_of||c.source_entity===j.source_entity&&c.source_id===j.source_id)))}),get:async id=>journals.find(j=>j.id===id),create:async d=>{const row={id:`journal-${journals.length}`, ...d};journals.push(row);return row;},update:async(id,d)=>Object.assign(journals.find(j=>j.id===id),d)},
 FinanceProposal:{count:async()=>0},FinancePostingIssue:{updateMany:async()=>{},upsert:async rows=>{issue=rows[0];}},FinanceLedgerLine:{upsert:async rows=>{for(const r of rows){const i=index.findIndex(x=>x.line_key===r.line_key);if(i<0)index.push(r);else index[i]=r;}},filter:async q=>({items:index.filter(l=>l.journal_id===q.journal_id)})},FinanceAuditEvent:{create:async()=>{}},AuditLog:{create:async()=>{}}};
 const ctx={admin:true,permissions:{},user:{id:'admin',email:'admin@example.test'},svc:{entities:e},base44:{asServiceRole:{entities:e}}};
 return {ctx,company,payment,source,bindings,accounts,journals,index,e,getIssue:()=>issue};
}
for(const type of ['refund','deposit_withdrawal'])for(const method of ['cash','instapay'])test(`${type} credits its ${method} mapping, not the generic cash routing`,async()=>{
 const f=fixture(type,method),r=await postFinanceSource(f.ctx,f.company,f.source);assert.equal(r.posted,true);
 assert.deepEqual(f.journals[0].lines.map(l=>[l.account_code,l.debit,l.credit]),[['211100',50000,0],[method==='cash'?'110100':'110300',0,50000]]);
 assert.equal(f.journals[0].source_summary.mapped_payment.payment_method,method);
 assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).already_posted,true);assert.equal(f.journals.length,1);
});
test('missing method mapping blocks instead of falling back to legacy cash',async()=>{
 const f=fixture('refund','wallet'),r=await postFinanceSource(f.ctx,f.company,f.source);assert.equal(r.blocked,true);assert.match(r.message,/PAYMENT_METHOD_ACC/);assert.equal(f.journals.length,0);
});
test('ambiguous method mapping blocks posting',async()=>{
 const f=fixture();f.bindings.push({...f.bindings[2],id:'duplicate',account_id:'cash'});assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).blocked,true);assert.equal(f.journals.length,0);
});
test('missing payment method never defaults to cash',async()=>{
 const f=fixture();delete f.payment.payment_method;assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).blocked,true);assert.equal(f.journals.length,0);
});
test('pending refunds and closed periods cannot post',async()=>{
 const f=fixture();f.payment.status='pending';assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).blocked,true);f.payment.status='completed';f.company.closed_through='2026-11-05';assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).blocked,true);assert.equal(f.journals.length,0);
});
test('configured semantic mappings automatically select refund company even without legacy policy',async()=>{
 const f=fixture();f.company.auto_post_enabled=false;assert.equal((await automaticFinanceCompanies(f.ctx,f.source)).length,1);
});
test('refund preview carries payment-method binding evidence without changing balances',async()=>{
 const f=fixture(),before=structuredClone(f.payment),plan=await mappedAdvancePlan(f.ctx,f.company,f.source);assert.equal(plan.source_summary.mapping_bindings[1].binding_id,'binding-2');assert.deepEqual(f.payment,before);assert.equal(f.journals.length,0);
});
function legacyRefund(){
 const f=fixture();const lines=[['advance',50000,0],['cash',0,50000]].map(([id,debit,credit])=>{const a=f.accounts.find(a=>a.id===id);return {account_id:id,account_code:a.code,account_name:a.name,management_mapping:a.management_mapping,debit,credit,cost_center:'branch',channel:'catering',product_reference:'payment'};});
 const original={id:'original',company_id:'company',branch_id:'branch',currency:'EGP',status:'posted',kind:'automatic',source_entity:'JournalEntry',source_id:'source',source_summary:{entries:structuredClone(f.source.entries),reference_id:'payment'},posting_key:'company:legacy:source',entry_date:'2026-11-05',rule_version:'automatic-operational-v1',lines,total_debit:50000,total_credit:50000,ledger_ready:true,analytics_version:1,updated_date:'j1'};f.journals.push(original);return {...f,original,input:{journal_id:'original',confirmed:true,reason:'Approved correction to the recorded InstaPay refund method'}};
}
test('legacy refund correction is asset-only, preserves original and is idempotent',async()=>{
 const f=legacyRefund(),original=structuredClone(f.original),payment=structuredClone(f.payment);
 const preview=await correctPaymentMethod(f.ctx,f.company,{...f.input,dry_run:true});assert.equal(preview.preview,true);assert.equal(f.journals.length,1);
 assert.deepEqual(preview.lines.map(l=>[l.account_code,l.debit,l.credit]),[['110100',50000,0],['110300',0,50000]]);
 const r=await correctPaymentMethod(f.ctx,f.company,f.input);assert.equal(r.corrected,true);assert.equal(r.verified,true);assert.equal(f.journals.length,2);assert.equal(f.index.length,2);assert.deepEqual(f.original,original);assert.deepEqual(f.payment,payment);
 assert.equal((await correctPaymentMethod(f.ctx,f.company,f.input)).already_posted,true);assert.equal(f.journals.length,2);assert.equal(f.index.length,2);
 assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).already_posted,true);assert.equal(f.journals.length,2);
});
test('correction cannot be used without permission or confirmation',async()=>{
 const f=legacyRefund();f.ctx.admin=false;await assert.rejects(()=>correctPaymentMethod(f.ctx,f.company,f.input),/Permission required/);f.ctx.admin=true;await assert.rejects(()=>correctPaymentMethod(f.ctx,f.company,{...f.input,confirmed:false}),/Confirm/);assert.equal(f.journals.length,1);
});
test('correction blocks closed dates, changed source and changed liability treatment',async()=>{
 for(const mutate of [f=>{f.company.closed_through='2026-11-05';},f=>{f.source.entries[0].debit=40000;},f=>{f.original.lines[0].account_id='bank';}]){const f=legacyRefund();mutate(f);await assert.rejects(()=>correctPaymentMethod(f.ctx,f.company,f.input));assert.equal(f.journals.length,1);}
});
test('void reverses the original and its payment-method correction without remapping',async()=>{
 const f=legacyRefund();await correctPaymentMethod(f.ctx,f.company,f.input);f.payment.status='voided';f.payment.voided_date='2026-11-06T10:00:00Z';f.payment.void_reason='Approved payment void';f.bindings.splice(0);
 const source={id:'void-source',reference_type:'catering_payment_void',reference_id:'payment',branch_id:'branch',posted:true,entry_date:f.payment.voided_date,entries:f.source.entries.map(l=>({...l,debit:l.credit,credit:l.debit}))};
 const r=await postPaymentVoid(f.ctx,f.company,source);assert.equal(r.posted,true);const reversal=f.journals.find(j=>j.id===r.journal_id);assert.equal(reversal.source_summary.payment_method_correction_id,'journal-1');
 const net=code=>reversal.lines.filter(l=>l.account_code===code).reduce((n,l)=>n+l.debit-l.credit,0);assert.equal(net('110100'),0);assert.equal(net('110300'),50000);assert.equal(net('211100'),-50000);
});