import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './financeRefundMethod.test.js';
import { capturePaymentAccounts } from './cateringConfiguredPayment.js';
import { configuredPaymentJournal } from './configuredPaymentJournal.js';
import { postFinanceSource } from './financeAutomatic.js';
function setup(){
 const f=fixture('deposit','custom_bank');f.company.write_token='';f.company.is_active=true;
 const method={id:'method',company_id:f.company.id,code:'custom_bank',name:'My custom bank',account_id:'bank',is_active:true,updated_date:'m1'};
 f.e.FinancePaymentMethod={get:async()=>method,filter:async q=>({items:q.code===method.code?[method]:[]}),update:async(id,data)=>Object.assign(method,data)};
 f.e.FinanceCompany.get=async()=>f.company;f.e.FinanceCompany.updateMany=async(q,update)=>{if(q.write_token===f.company.write_token)Object.assign(f.company,update.$set);};
 f.accounts.forEach(a=>{a.classification=a.code.startsWith('1')?'assets':'liabilities';});f.e.FinanceAccount.get=async id=>f.accounts.find(a=>a.id===id);
 const bridges=[],operations=[];
 f.e.GLAccount={filter:async q=>({items:bridges.filter(a=>a.description===q.description)}),create:async data=>{const row={id:`bridge-${bridges.length}`,...data};bridges.push(row);return row;}};
 f.e.JournalEntry.create=async data=>{Object.assign(f.source,data);operations.push(data);return f.source;};
 return {...f,method,bridges,operations,event:{id:'event',branch_id:'branch',client_id:'client',event_name:'Occasion'}};
}
test('new custom method captures accounts, creates balanced operational lines, then posts once through the gateway',async()=>{
 const f=setup(),routing=await capturePaymentAccounts(f.ctx.svc,f.event,f.payment);Object.assign(f.payment,routing);
 assert.equal(f.method.has_transactions,true);assert.equal(routing.payment_account_snapshot.accounts[0].account_id,'bank');
 // A later master edit cannot silently reroute this payment.
 f.method.account_id='cash';f.bindings.splice(0);
 await configuredPaymentJournal(f.ctx.svc,f.payment,f.event);
 assert.deepEqual(f.operations[0].entries.map(l=>[l.account_number,l.debit,l.credit]),[['110300',50000,0],['211100',0,50000]]);
 assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).posted,true);
 assert.equal(f.journals[0].lines[0].account_id,'bank');assert.equal(f.journals[0].total_debit,f.journals[0].total_credit);
 assert.equal((await postFinanceSource(f.ctx,f.company,f.source)).already_posted,true);assert.equal(f.journals.length,1);
});
test('inactive, unknown, foreign and incomplete mappings fail before operational journals exist',async()=>{
 for(const mutate of [f=>{f.method.is_active=false;},f=>{f.payment.payment_method='unknown';},f=>{f.accounts.find(a=>a.id==='bank').company_id='foreign';},f=>{f.bindings.splice(0);}]){
  const f=setup();mutate(f);await assert.rejects(()=>capturePaymentAccounts(f.ctx.svc,f.event,f.payment));assert.equal(f.operations.length,0);assert.equal(f.journals.length,0);assert.equal(f.company.write_token,'');
 }
});
test('deactivation after submission blocks approval; existing posted history remains untouched',async()=>{
 const f=setup();Object.assign(f.payment,await capturePaymentAccounts(f.ctx.svc,f.event,f.payment));f.method.is_active=false;
 await assert.rejects(()=>configuredPaymentJournal(f.ctx.svc,f.payment,f.event),/deactivated/);assert.equal(f.operations.length,0);
});
test('closed periods and unbalanced source journals are rejected',async()=>{
 const f=setup();f.company.closed_through='2026-11-05';await assert.rejects(()=>capturePaymentAccounts(f.ctx.svc,f.event,f.payment),/locked/);
 f.company.closed_through='';Object.assign(f.payment,await capturePaymentAccounts(f.ctx.svc,f.event,f.payment));await configuredPaymentJournal(f.ctx.svc,f.payment,f.event);f.source.entries[0].debit=49999;
 const result=await postFinanceSource(f.ctx,f.company,f.source);assert.equal(result.blocked,true);assert.match(result.message,/balance/);assert.equal(f.journals.length,0);
});