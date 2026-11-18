import test from 'node:test';
import assert from 'node:assert/strict';
import { mappedAdvancePlan } from './financeMappedAdvance.js';

function fixture(type='penalty') {
  const company={id:'company',branch_ids:['branch'],currency:'EGP',currency_decimals:2,closed_through:''};
  const payment={id:'payment',status:'completed',payment_type:type,credit_note:false,branch_id:'branch',event_id:'event',client_id:'client',payment_method:'instapay',amount:6000,payment_date:'2026-11-05T10:52:11Z',updated_date:'2026-11-05T10:52:12Z'};
  const source={id:'source',branch_id:'branch',reference_type:'catering_payment',reference_id:'payment',posted:true,entry_date:payment.payment_date,entries:[{gl_account_id:'cash',debit:6000,credit:0},{gl_account_id:'revenue',debit:0,credit:6000}]};
  const bindings=[['CUSTOMER_ADVANCE_ACC','advance'],['Cancellation_Customer','penalty'],['PAYMENT_METHOD_ACC','cash']].map(([mapping_key,account_id])=>({id:mapping_key,mapping_key,account_id,priority:100,effective_from:'2026-11-05',conditions:{}}));
  const accounts=[['advance','211100'],['penalty','410800'],['cash','110300']].map(([id,code])=>({id,code,name:id,active:true,posting:true,management_mapping:'mapped'}));
  const entities={
    CateringPayment:{get:async()=>payment},
    CateringEvent:{get:async()=>({id:'event',branch_id:'branch',client_id:'client'})},
    FinanceAccountBinding:{filter:async query=>({items:bindings.filter(b=>query.mapping_key.$in.includes(b.mapping_key))})},
    FinanceAccount:{filter:async query=>({items:accounts.filter(a=>query.id.$in.includes(a.id))})},
    JournalEntry:{count:async()=>1},
    FinanceJournal:{filter:async()=>({items:[]})},
    FinanceProposal:{count:async()=>0},
  };
  return {ctx:{admin:true,svc:{entities}},company,payment,source,bindings,accounts};
}
test('completed retained penalty routes advance liability to Cancellation_Customer, not cash',async()=>{
  const f=fixture();const plan=await mappedAdvancePlan(f.ctx,f.company,f.source);
  assert.ok(plan,'The automatic adapter must not skip penalty payments');
  assert.deepEqual(plan.lines.map(l=>[l.account_code,l.debit,l.credit]),[['211100',6000,0],['410800',0,6000]]);
  assert.deepEqual(plan.source_summary.mapping_bindings.map(b=>b.key),['CUSTOMER_ADVANCE_ACC','Cancellation_Customer']);
});
test('final balance remains an advance until recognition',async()=>{
  const f=fixture('final_balance');const plan=await mappedAdvancePlan(f.ctx,f.company,f.source);
  assert.ok(plan);assert.deepEqual(plan.lines.map(l=>[l.account_code,l.debit,l.credit]),[['110300',6000,0],['211100',0,6000]]);
});
test('missing cancellation revenue mapping blocks instead of falling back to cash',async()=>{
  const f=fixture();f.bindings.splice(1,1);
  await assert.rejects(()=>mappedAdvancePlan(f.ctx,f.company,f.source),/Missing account mapping for Cancellation_Customer/);
});
test('pending penalty cannot post',async()=>{
  const f=fixture();f.payment.status='pending';
  await assert.rejects(()=>mappedAdvancePlan(f.ctx,f.company,f.source),/completed/);
});
test('an already posted penalty returns its original journal without creating another',async()=>{
  const f=fixture();const original={id:'journal',source_entity:'JournalEntry',source_id:'source',branch_id:'branch',entry_date:'2026-11-05',source_summary:{entries:f.source.entries}};
  f.ctx.svc.entities.FinanceJournal.filter=async()=>({items:[original]});
  const plan=await mappedAdvancePlan(f.ctx,f.company,f.source);assert.equal(plan.already_posted,true);assert.equal(plan.journal.id,'journal');
});