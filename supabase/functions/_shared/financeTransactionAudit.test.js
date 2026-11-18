import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionSource, transactionEligible, transactionRange, transactionSuggestion } from './financeTransactionSources.js';
import { requireUnposted, transactionKey, confirmTransactionJournal } from './financeTransactionEvidence.js';

test('only approved sources and explicit eligibility are accepted',()=>{
 assert.throws(()=>transactionSource('User'),/Unsupported/);
 assert.equal(transactionEligible(transactionSource('CateringPayment'),{status:'pending'}),false);
 assert.equal(transactionEligible(transactionSource('CateringPayment'),{status:'completed'}),true);
 assert.equal(transactionEligible(transactionSource('Order'),{status:'completed'}),true);
});
test('invalid dates and reversed ranges fail closed',()=>{
 assert.throws(()=>transactionRange({from:'2026-02-30'}),/Invalid/);
 assert.throws(()=>transactionRange({from:'2026-11-06',to:'2026-11-05'}),/must not follow/);
 assert.equal(transactionRange({to:'2026-11-05'}).$lt,'2026-11-06');
});
test('posted and pending source links prohibit recovery',()=>{
 assert.throws(()=>requireUnposted({journals:[{id:'j'}],proposals:[]}),/already/);
 assert.throws(()=>requireUnposted({journals:[],proposals:[{id:'p'}]}),/pending/);
});
test('canonical posting keys retain existing duplicate guards',()=>{
 assert.equal(transactionKey({id:'co'},'JournalEntry','j'),'co:legacy:j');
 assert.equal(transactionKey({id:'co'},'Order','o'),'co:module:Order:o');
});
test('suggestions never bypass a closed period or independent review',()=>{
 assert.match(transactionSuggestion('Posting is locked through 2026-10-31'),/open period/);
 assert.match(transactionSuggestion('A pending proposal exists'),/different authorized reviewer/);
});
test('success requires a posted journal and every derived line',async()=>{
 const company={id:'co',branch_ids:['b'],currency_decimals:2},journal={id:'j',company_id:'co',branch_id:'b',entry_date:'2026-11-05',status:'posted',ledger_ready:true,total_debit:10,total_credit:10,lines:[{account_id:'a',account_code:'110100',debit:10,credit:0,cost_center:'b'},{account_id:'c',account_code:'211100',debit:0,credit:10,cost_center:'b'}]};
 const ctx={admin:true,svc:{entities:{FinanceJournal:{get:async()=>journal},FinanceLedgerLine:{filter:async()=>({items:[{}]})}}}};
 await assert.rejects(()=>confirmTransactionJournal(ctx,company,'j'),/incomplete/);
 ctx.svc.entities.FinanceLedgerLine.filter=async()=>({items:journal.lines.map((l,i)=>({line_key:`j:${i}`,branch_id:'b',entry_date:journal.entry_date,account_code:l.account_code,debit_units:l.debit*100,credit_units:l.credit*100}))});
 assert.equal((await confirmTransactionJournal(ctx,company,'j')).verified,true);
});