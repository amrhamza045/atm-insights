import { financeCompany,financeBranch,withFinanceLock } from './financeAccess.js';
import { financeGroupCompanies } from './financeHierarchy.js';
import { requireValue } from './financeValidation.js';
import { analyticsScope } from './financeAnalyticsScope.js';
import { indexFinanceLedger } from './financeLedger.js';
import { comparisonMetrics,comparisonSums,companyComparison,combineComparisons } from './financeComparisonMath.js';
import { comparisonVariance } from './financeComparisonVariance.js';

export async function financeComparison(ctx,anchor,input){
 requireValue(Array.isArray(input.targets)&&input.targets.length>=2&&input.targets.length<=6,'Select two to six comparison entities.');
 const scope=await analyticsScope(ctx,anchor,{from:input.from,to:input.to}),unit=input.unit||'month';
 requireValue(['month','quarter','year'].includes(unit),'Choose month, quarter or year.');
 const months=(Number(scope.to.slice(0,4))-Number(scope.from.slice(0,4)))*12+Number(scope.to.slice(5,7))-Number(scope.from.slice(5,7))+1;
 requireValue(months<=36,'Choose up to 36 calendar months for a comparison.');
 const targets=[],companies=new Map(),seen=new Set();
 for(const t of input.targets){
  requireValue(t&&['branch','company','group'].includes(t.type),'Choose a valid comparison entity type.');
  const c=await financeCompany(ctx,t.company_id);
  requireValue(c.currency===anchor.currency&&!!c.is_test===!!anchor.is_test,'Compare only the same currency and test/production environment.');
  const id=`${t.type}:${c.id}:${t.type==='branch'?t.branch_id:''}`;requireValue(!seen.has(id),'Remove duplicate comparison entities.');seen.add(id);
  let members=[c],label=c.name;
  if(t.type==='branch'){
   financeBranch(ctx,c,t.branch_id);const b=await ctx.svc.entities.Branch.get(t.branch_id);
   requireValue(b,'Branch no longer exists.',404);label=`${c.name} / ${b.name}`;
  }else requireValue(ctx.admin||!ctx.permissions.branch_id,'Company-wide comparisons require unrestricted branch access. Select an authorized branch instead.',403);
  if(t.type==='group'){members=await financeGroupCompanies(ctx,c);label=`${c.name} + subsidiaries (uneliminated)`;}
  const scopes=members.map(member=>({company:member,branch_ids:t.type==='branch'?[t.branch_id]:member.branch_ids}));
  for(const s of scopes){requireValue(s.branch_ids.length>0,'A selected entity has no company branches.');let item=companies.get(s.company.id);if(!item){item={company:s.company,branches:new Set()};companies.set(s.company.id,item);}s.branch_ids.forEach(id=>item.branches.add(id));}
  targets.push({id,label,type:t.type,scopes});
 }
 requireValue(companies.size<=6,'A comparison may include up to six unique legal companies, including group subsidiaries.');
 const decimals=Math.max(...[...companies.values()].map(c=>c.company.currency_decimals)),sources=new Map();
 for(const {company,branches}of companies.values()){
  const data=await withFinanceLock(ctx,company,async fresh=>{
   const remaining=await indexFinanceLedger(ctx,fresh);if(remaining)return {ready:false,remaining};
   const query={company_id:fresh.id,branch_id:{$in:[...branches]}};
   const [before,period]=await Promise.all([
    ctx.svc.entities.FinanceLedgerLine.aggregate({query:{...query,entry_date:{$lt:scope.from}},groupBy:['branch_id','classification'],sum:comparisonSums,limit:1000}),
    ctx.svc.entities.FinanceLedgerLine.aggregate({query:{...query,entry_date:{$gte:scope.from,$lte:scope.to}},groupBy:['branch_id','classification'],dateBucket:{field:'entry_date',unit:'month'},sum:comparisonSums,limit:1000})
   ]);
   requireValue(!before.truncated&&!period.truncated,'Too many reporting groups. Shorten dates or select fewer branches; incomplete totals are not displayed.');
   return {ready:true,before,period};
  });
  if(!data.ready)return {ready:false,remaining:data.remaining,message:'Selected-company journals still need preparation. Continue preparation; partial comparisons are not shown.'};
  sources.set(company.id,data);
 }
 const rows=[];
 for(const t of targets){
  const parts=t.scopes.map(s=>companyComparison(sources.get(s.company.id),s.branch_ids,scope.from,scope.to,unit,s.company.currency_decimals));
  let pending=0,posting_issues=0;
  for(const s of t.scopes){const query={company_id:s.company.id,branch_id:{$in:s.branch_ids},entry_date:{$lte:scope.to}};const counts=await Promise.all([ctx.svc.entities.FinanceProposal.count({...query,status:'pending'}),ctx.svc.entities.FinancePostingIssue.count({...query,status:'open'})]);pending+=counts[0];posting_issues+=counts[1];}
  rows.push({id:t.id,label:t.label,type:t.type,members:t.scopes.map(s=>s.company.name),...combineComparisons(parts,decimals),pending,posting_issues});
 }
 const notes=['Posted ledger only. Historical reconstruction, opening balances and unconnected sources may be incomplete. Empty activity is not proof of zero business activity.','All columns use the same currency, environment and dates. Revenue, profit and cash movements cover the period; assets, liabilities, equity and closing cash are end-date positions.','Parent-company columns show their own ledger. Parent-group columns include all descendants without intercompany eliminations, investment offsets or ownership adjustments; these are NOT statutory consolidated accounts.','Marginal percentages use total period revenue and profit, not an average of entity percentages. Margins are unavailable when revenue is zero or negative.','Reporting preparation may update rebuildable indexes only; no accounting amounts or source records are changed. Companies are read under individual locks, not an atomic group-wide snapshot.'];
 const overlaps=targets.some((t,i)=>targets.slice(i+1).some(other=>t.scopes.some(s=>other.scopes.some(o=>s.company.id===o.company.id&&s.branch_ids.some(id=>o.branch_ids.includes(id))))));
 if(overlaps)notes.push('Selected columns overlap: do not sum them. A group may already include a selected subsidiary, or a company may already include a selected branch.');
 for(const r of rows){if(!r.recorded_lines)notes.push(`${r.label}: no posted period activity; earlier opening balances may still exist.`);if(r.pending||r.posting_issues)notes.push(`${r.label}: ${r.pending} pending proposals and ${r.posting_issues} blocked postings through the cutoff are excluded.`);if(r.values.unclassified_cash)notes.push(`${r.label}: unclassified cash movements require reconciliation.`);}
 return {ready:true,from:scope.from,to:scope.to,unit,currency:anchor.currency,currency_decimals:decimals,metrics:comparisonMetrics,rows,variance:comparisonVariance(rows,decimals),notes,refreshed_at:new Date().toISOString()};
}