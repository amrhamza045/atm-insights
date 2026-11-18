import { analyticsScope } from './financeAnalyticsScope.js';
import { branchQuery } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { indexFinanceLedger } from './financeLedger.js';
import { branchTrendRows } from './financeBranchTrendMath.js';
export async function financeBranchTrends(ctx,company,input){
 const scope=await analyticsScope(ctx,company,{}),currentYear=Number(scope.today.slice(0,4)),year=Number(input.year||currentYear);
 requireValue(Number.isInteger(year)&&year>=2000&&year<=currentYear,'Choose a year from 2000 through the current company-local year.');
 const months=year<currentYear?12:Number(scope.today.slice(5,7))-1,from=`${year-3}-01-01`,to=new Date(Date.UTC(year,months,0)).toISOString().slice(0,10);
 const remaining=await indexFinanceLedger(ctx,company);if(remaining)return {ready:false,remaining};
 const authorized=branchQuery(ctx,company).branch_id.$in,query={id:{$in:authorized}};
 const [page,total_branches]=await Promise.all([ctx.svc.entities.Branch.filter(query,{sort:'name',limit:4,...(input.cursor?{cursor:input.cursor}:{})}),ctx.svc.entities.Branch.count(query)]);
 const ids=page.items.map(b=>b.id),dates={entry_date:{$gte:from,$lte:to}},allScope={company_id:company.id,...branchQuery(ctx,company),...dates};
 const [aggregate,pending,posting_issues]=await Promise.all([
  ids.length?ctx.svc.entities.FinanceLedgerLine.aggregate({query:{company_id:company.id,branch_id:{$in:ids},...dates,classification:{$in:['revenue','cogs','operating_expenses','other_result','income_tax']}},groupBy:['branch_id','classification'],dateBucket:{field:'entry_date',unit:'month'},sum:['debit_units','credit_units'],limit:1000}):Promise.resolve({rows:[],truncated:false}),
  ctx.svc.entities.FinanceProposal.count({...allScope,status:'pending'}),ctx.svc.entities.FinancePostingIssue.count({...allScope,status:'open'})
 ]);
 requireValue(!aggregate.truncated,'Trend aggregates exceed the complete-report limit; no partial branch results are shown.');
 return {ready:true,items:branchTrendRows(aggregate.rows,page.items,year,months,company.currency_decimals),next_cursor:page.next_cursor,has_more:page.has_more,total_branches,year,months,today:scope.today,through:to,reference_from:from,pending,posting_issues,currency:company.currency,refreshed_at:new Date().toISOString(),notes:[
  'All authorized branches of this company are available through Load more branches, including inactive branches assigned to the company. This annual view uses its own year selector, not the dashboard date or single-branch filters.',
  'Only complete calendar months are compared. Current-month and future activity are excluded; year-to-date growth compares identical completed months in both years.',
  'Revenue and operating expenses require postings in their respective classifications. Net profit includes all recorded P&L classifications, including other results and income tax. Unrecorded metric/month cells remain unavailable, not zero.',
  'Annual seasonal variance compares each month with that branch’s twelve-month mean; it is unavailable for the current year or if any monthly metric is missing.',
  'Three-year seasonal variance requires the same calendar month in all three previous years. Baseline averages are rounded to company currency precision. Differences equal actual minus baseline; percentages require a positive baseline.',
  'Positive cost growth means costs increased, not that performance improved. Percentages with zero or negative baselines are unavailable; absolute changes remain visible when both amounts are known.',
  'Posted ledger only. Historical reconstruction and unconnected costs may be incomplete even when all months have postings. Seasonality is a planning indicator, not a forecast or proof of complete accounts. Pending proposals and blocked postings in the displayed and reference years are excluded.'
 ]};
}