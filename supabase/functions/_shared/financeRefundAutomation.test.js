import test from 'node:test';
import assert from 'node:assert/strict';
import { automaticFinanceCompanies } from './financeAutomaticCompanies.js';
import { configureFinanceAutomatic } from './financeAutomatic.js';
import { postFinanceSource } from './financeAutomatic.js';
import { inspectTransactionAudit } from './financeTransactionAudit.js';
import { confirmTransactionJournal } from './financeTransactionEvidence.js';
function fixture(){
 const company={id:'company',is_active:true,is_test:true,branch_ids:['branch'],currency:'EGP',currency_decimals:2,edition:'fnb',auto_post_enabled:false,auto_account_map:{unrelated:'other'}};
 const payments={eman:{id:'eman',branch_id:'branch',payment_type:'refund',status:'completed',amount:20000,updated_date:'v1',payment_date:'2026-11-05'},moataz:{id:'moataz',branch_id:'branch',payment_type:'refund',status:'completed',amount:10000,updated_date:'v1',payment_date:'2026-11-05'}};
 const sources=Object.fromEntries(Object.values(payments).map(p=>[p.id,{id:`op-${p.id}`,branch_id:'branch',reference_type:'catering_credit_note',reference_id:p.id,revenue_source:'catering',posted:true,entry_date:p.payment_date,updated_date:'v1',entries:[{gl_account_id:'deposits',debit:p.amount,credit:0},{gl_account_id:'cash',debit:0,credit:p.amount}]}]));
 const accounts=[['advance','211100'],['cash-account','110100'],['other','110200']].map(([id,code])=>({id,code,name:id,company_id:'company',active:true,posting:true,management_mapping:'mapped'}));
 const journals=[],index=[],audits=[];
 const entities={
  FinancePaymentMethod:{aggregate:async()=>({rows:[]})},
  FinanceAccountBinding:{filter:async()=>({items:[]}),aggregate:async()=>({rows:[]})},
  CateringPayment:{get:async id=>payments[id]},JournalEntry:{filter:async q=>({items:Object.values(sources).filter(s=>s.reference_id===q.reference_id)})},
  FinanceCompany:{filter:async()=>({items:[structuredClone(company)]}),update:async(id,d)=>Object.assign(company,d)},
  GLAccount:{filter:async q=>({items:q.id.$in.map(id=>({id}))})},
  FinanceAccount:{filter:async q=>({items:accounts.filter(a=>q.id.$in.includes(a.id))})},
  FinanceJournal:{filter:async q=>({items:journals.filter(j=>q.posting_key?j.posting_key===q.posting_key:q.$or?.some(c=>c.source_entity===j.source_entity&&c.source_id===j.source_id))}),count:async()=>0,create:async d=>{const j={id:`journal-${journals.length}`, ...d};journals.push(j);return j;},update:async(id,d)=>Object.assign(journals.find(j=>j.id===id),d),get:async id=>journals.find(j=>j.id===id)},
  FinanceProposal:{filter:async()=>({items:[]}),count:async()=>0},
  FinanceLedgerLine:{upsert:async rows=>index.push(...rows),filter:async q=>({items:index.filter(l=>l.journal_id===q.journal_id)})},
  FinancePostingIssue:{updateMany:async()=>({}),upsert:async()=>({})},
  FinanceAuditEvent:{create:async a=>audits.push(a)},AuditLog:{create:async a=>audits.push(a)}
 };
 const ctx={admin:true,permissions:{},user:{id:'admin',email:'admin@example.test'},svc:{entities},base44:{asServiceRole:{entities}}};
 return {ctx,company,sources,journals,index};
}
test('routing saved for Eman persists and automatically posts Moataz using the same company and accounts',async()=>{
 const f=fixture();
 await configureFinanceAutomatic(f.ctx,f.company,{enabled:true,confirmed:true,from:'2026-11-05',source_currency:'EGP',account_map:{unrelated:'other',deposits:'advance',cash:'cash-account'}});
 assert.equal(f.company.auto_post_enabled,true);assert.equal(f.company.auto_account_map.unrelated,'other');
 const candidates=await automaticFinanceCompanies(f.ctx,f.sources.moataz);
 assert.equal(candidates.length,1,'A test label must not disable explicitly confirmed recurring routing');
 const posted=await postFinanceSource(f.ctx,candidates[0],f.sources.moataz);
 assert.equal(posted.posted,true);assert.equal(f.journals.length,1);assert.equal(f.journals[0].is_test,true);
 assert.deepEqual(f.journals[0].lines.map(l=>[l.account_code,l.debit,l.credit]),[['211100',10000,0],['110100',0,10000]]);
 assert.equal((await confirmTransactionJournal(f.ctx,f.company,posted.journal_id)).verified,true);
 const detail=await inspectTransactionAudit(f.ctx,f.company,{source_entity:'CateringPayment',source_id:'moataz'});
 assert.equal(detail.journals[0].id,posted.journal_id);
 const retry=await postFinanceSource(f.ctx,candidates[0],f.sources.moataz);
 assert.equal(retry.already_posted,true);assert.equal(f.journals.length,1);
});
test('a disabled company with no semantic routing remains excluded',async()=>{
 const f=fixture();assert.deepEqual(await automaticFinanceCompanies(f.ctx,f.sources.moataz),[]);
});
test('configured production and test companies are treated consistently',async()=>{
 for(const is_test of [true,false]){const f=fixture();Object.assign(f.company,{is_test,auto_post_enabled:true});assert.equal((await automaticFinanceCompanies(f.ctx,f.sources.moataz)).length,1);}
});
test('saved routing still blocks closed periods and missing destination accounts',async()=>{
 const f=fixture();Object.assign(f.company,{auto_post_enabled:true,auto_post_from:'2026-11-05',auto_source_currency:'EGP',auto_account_map:{deposits:'advance',cash:'cash-account'},closed_through:'2026-11-05'});
 assert.equal((await postFinanceSource(f.ctx,f.company,f.sources.moataz)).blocked,true);assert.equal(f.journals.length,0);
 f.company.closed_through='';delete f.company.auto_account_map.cash;
 assert.equal((await postFinanceSource(f.ctx,f.company,f.sources.moataz)).blocked,true);assert.equal(f.journals.length,0);
});