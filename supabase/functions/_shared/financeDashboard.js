import { analyticsScope } from './financeAnalyticsScope.js';
import { financeStatements } from './financeStatements.js';
import { financialTrend } from './financeDashboardMath.js';
import { requireValue } from './financeValidation.js';
export async function financeDashboard(ctx,company,input){
 const scope=await analyticsScope(ctx,company,input),unit=input.unit||'month';requireValue(['month','quarter','year'].includes(unit),'Choose monthly, quarterly or yearly grouping.');
 const monthSpan=(Number(scope.to.slice(0,4))-Number(scope.from.slice(0,4)))*12+Number(scope.to.slice(5,7))-Number(scope.from.slice(5,7))+1;requireValue(monthSpan<=(unit==='year'?2880:unit==='quarter'?720:240),'Choose a shorter range, with at most 240 display periods.');
 const data=await financeStatements(ctx,company,{...input,from:scope.from,to:scope.to});if(!data.ready)return data;
 const result=await ctx.svc.entities.FinanceLedgerLine.aggregate({query:{...scope.ledgerScope,entry_date:{$gte:scope.from,$lte:scope.to}},dateBucket:{field:'entry_date',unit:unit==='year'?'year':'month'},groupBy:'classification',sum:['debit_units','credit_units','cash_units'],limit:1000});requireValue(!result.truncated,'More than 1,000 financial trend groups. Narrow dates or use yearly grouping; incomplete totals are not displayed.');
 const trend=financialTrend(result.rows,data.dashboard_opening,scope.from,scope.to,unit,company.currency_decimals);
 return {...data,today:scope.today,branch_id:scope.branch_id,unit,trend,has_activity:result.rows.some(r=>Number(r.count)>0),notes:[...data.notes,'Revenue, costs and profit use the selected period. Assets, liabilities, equity and cash are cumulative at each period end, including earlier posted opening balances.','An empty activity period is not evidence of complete history. Recipe-cost estimates are separate from financial postings and never alter profit or inventory.']};
}