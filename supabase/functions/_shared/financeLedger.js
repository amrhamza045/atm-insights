import { requireValue, moneyUnits, validateLines } from './financeValidation.js';
export const CLASSIFICATIONS={1:'assets',2:'liabilities',3:'equity',4:'revenue',5:'cogs',6:'operating_expenses',7:'other_result',8:'income_tax'};
import { reportCashAccount,reportCashSection } from './financeReportingRules.js';
import { financeDimensions } from './financeDimensions.js';
export async function projectFinanceJournal(ctx,company,journal) {
 if(journal.status!=='posted'||journal.ledger_ready&&journal.analytics_version===1)return;
 requireValue(journal.company_id===company.id&&journal.currency===company.currency,'Reporting currency or company mismatch.');
 validateLines(journal.lines,company.currency_decimals);
 const ids=[...new Set(journal.lines.map(l=>l.account_id))];
 const {items:accounts}=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids}},{limit:100});
 const accountMap=new Map(accounts.map(a=>[a.id,a]));
 requireValue(ids.every(id=>accountMap.has(id)),'A journal account is missing; restore it before preparing reports.');
 const isCash=l=>reportCashAccount(accountMap.get(l.account_id));
 const cash=journal.lines.filter(isCash);
 const netCash=cash.reduce((s,l)=>s+moneyUnits(l.debit,company.currency_decimals)-moneyUnits(l.credit,company.currency_decimals),0);
 const sections=new Set(journal.lines.filter(l=>!isCash(l)).map(l=>reportCashSection(accountMap.get(l.account_id))));
 const section=journal.kind==='opening'?'opening':netCash===0?'transfer':sections.size===1?[...sections][0]:'unclassified';
 const dimensions=await financeDimensions(ctx,journal);
 const records=journal.lines.map((l,i)=>{
  const debit=moneyUnits(l.debit,company.currency_decimals),credit=moneyUnits(l.credit,company.currency_decimals),amount=isCash(l)?debit-credit:0;
  requireValue(/^[1-8][0-9]{0,11}$/.test(l.account_code)&&CLASSIFICATIONS[l.account_code[0]],'An indexed line needs a valid company account code.');
  return {...dimensions(l),line_key:`${journal.id}:${i}`,company_id:company.id,branch_id:journal.branch_id,journal_id:journal.id,entry_date:journal.entry_date,account_code:l.account_code,account_name:l.account_name,classification:CLASSIFICATIONS[l.account_code[0]],debit_units:debit,credit_units:credit,cash_units:amount,cash_operating:section==='operating'?amount:0,cash_investing:section==='investing'?amount:0,cash_financing:section==='financing'?amount:0,cash_unclassified:section==='unclassified'?amount:0,cash_opening:section==='opening'?amount:0};
 });
 await ctx.svc.entities.FinanceLedgerLine.upsert(records,{key:'line_key'});
 await ctx.svc.entities.FinanceJournal.update(journal.id,{ledger_ready:true,analytics_version:1});
}
export async function indexFinanceLedger(ctx,company,analytics=false) {
 const query={company_id:company.id,status:'posted',...(analytics?{$or:[{ledger_ready:{$ne:true}},{analytics_version:{$ne:1}}]}:{ledger_ready:{$ne:true}})};
 const page=await ctx.svc.entities.FinanceJournal.filter(query,{limit:25});
 for(const journal of page.items)await projectFinanceJournal(ctx,company,journal);
 return await ctx.svc.entities.FinanceJournal.count(query);
}