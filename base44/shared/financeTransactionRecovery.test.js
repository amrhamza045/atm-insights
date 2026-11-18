import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTransactionOneTime } from './financeTransactionRecovery.js';
import { decideFinanceProposal } from './financeProposals.js';

function fixture(){
 const company={id:'company',branch_ids:['branch'],currency:'EGP',currency_decimals:2,edition:'fnb'};
 const source={id:'expense',branch_id:'branch',status:'approved',amount:50,expense_date:'2026-11-05',updated_date:'v1'};
 const accounts=[{id:'expense-account',code:'610100',name:'Expense',active:true,posting:true,management_mapping:'operating_expenses'},{id:'cash-account',code:'110100',name:'Cash',active:true,posting:true,management_mapping:'assets'}];
 const proposals=[],journals=[],index=[];
 const entities={
  Expense:{get:async()=>source},JournalEntry:{filter:async()=>({items:[]})},
  FinanceAccount:{filter:async()=>({items:accounts})},
  FinanceProposal:{filter:async q=>({items:proposals.filter(p=>p.status===q.status)}),get:async id=>proposals.find(p=>p.id===id),create:async p=>{const row={id:'proposal',...p};proposals.push(row);return row;},update:async(id,p)=>Object.assign(proposals.find(p=>p.id===id),p)},
  FinanceJournal:{filter:async q=>({items:journals.filter(j=>q.proposal_id?j.proposal_id===q.proposal_id:j.status===q.status)}),count:async()=>journals.filter(j=>j.status==='posted').length,get:async id=>journals.find(j=>j.id===id),create:async j=>{const row={id:'journal',...j};journals.push(row);return row;},update:async(id,data)=>Object.assign(journals.find(j=>j.id===id),data)},
  FinanceLedgerLine:{filter:async()=>({items:index}),upsert:async rows=>{index.splice(0,index.length,...rows);}},
 };
 const ctx={admin:true,permissions:{},user:{id:'preparer',email:'preparer@example.test'},svc:{entities}};
 const input={source_entity:'Expense',source_id:'expense',source_version:'v1',target_version:'v1',entry_date:'2026-11-05',confirmed:true,reason:'Verified invoice; one-time correction only.',lines:[{account_id:'expense-account',debit:50,credit:0,cost_center:'branch'},{account_id:'cash-account',debit:0,credit:50,cost_center:'branch'}]};
 return {ctx,company,source,input,proposals,journals,index};
}
test('one-time correction requires confirmation and unchanged source evidence',async()=>{
 const f=fixture();await assert.rejects(()=>prepareTransactionOneTime(f.ctx,f.company,{...f.input,confirmed:false}),/Confirm/);
 f.source.updated_date='v2';await assert.rejects(()=>prepareTransactionOneTime(f.ctx,f.company,f.input),/Source changed/);assert.equal(f.proposals.length,0);
});
test('one-time correction preserves source amount and creates no routing',async()=>{
 const f=fixture(),policy=JSON.stringify(f.company);await assert.rejects(()=>prepareTransactionOneTime(f.ctx,f.company,{...f.input,lines:f.input.lines.map(l=>({...l,debit:l.debit?60:0,credit:l.credit?60:0}))}),/recorded source amount/);
 const result=await prepareTransactionOneTime(f.ctx,f.company,f.input);assert.equal(result.pending_review,true);assert.equal(f.journals.length,0);assert.equal(JSON.stringify(f.company),policy);
 await assert.rejects(()=>prepareTransactionOneTime(f.ctx,f.company,f.input),/pending/);
});
test('one-time correction retains independent review, including administrators',async()=>{
 const f=fixture();await prepareTransactionOneTime(f.ctx,f.company,f.input);
 await assert.rejects(()=>decideFinanceProposal(f.ctx,f.company,{proposal_id:'proposal',decision:'posted',note:'Reviewed'}),/different authorized person/);
 assert.equal(f.journals.length,0);
});
test('different reviewer posts once and receives verified ledger confirmation',async()=>{
 const f=fixture();await prepareTransactionOneTime(f.ctx,f.company,f.input);f.ctx.user={id:'reviewer',email:'reviewer@example.test'};
 const r=await decideFinanceProposal(f.ctx,f.company,{proposal_id:'proposal',decision:'posted',note:'Verified original expense and correction date.'});
 assert.equal(r.verified,true);assert.equal(r.journal_id,'journal');assert.equal(f.index.length,2);assert.equal(f.proposals[0].status,'posted');
 const replay=await decideFinanceProposal(f.ctx,f.company,{proposal_id:'proposal',decision:'posted',note:'Retry'});assert.equal(replay.already_decided,true);assert.equal(f.journals.length,1);
});
test('changed source blocks independent approval without posting',async()=>{
 const f=fixture();await prepareTransactionOneTime(f.ctx,f.company,f.input);f.ctx.user={id:'reviewer'};f.source.amount=55;f.source.updated_date='v2';
 await assert.rejects(()=>decideFinanceProposal(f.ctx,f.company,{proposal_id:'proposal',decision:'posted',note:'Reviewed'}),/Source or operational linkage changed/);assert.equal(f.journals.length,0);
});
test('one-time correction cannot use a closed accounting date',async()=>{
 const f=fixture();f.company.closed_through='2026-11-05';await assert.rejects(()=>prepareTransactionOneTime(f.ctx,f.company,f.input),/locked/);assert.equal(f.proposals.length,0);
});