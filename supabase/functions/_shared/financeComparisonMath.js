import { financialTrend } from './financeDashboardMath.js';
import { reportUnits } from './financeAnalyticsScope.js';
export const comparisonMetrics=[
 ['revenue','Net revenue','amount','period'],['cogs','Cost of sales','amount','period'],['gross_profit','Gross profit','amount','period'],['expenses','Operating expenses','amount','period'],['operating_profit','Operating profit','amount','period'],['net_profit','Net profit / loss','amount','period'],
 ['gross_margin','Gross margin','percent','period'],['operating_margin','Operating margin','percent','period'],['net_margin','Net margin','percent','period'],
 ['assets','Assets','amount','closing'],['liabilities','Liabilities','amount','closing'],['equity','Total equity','amount','closing'],['closing_cash','Closing cash and equivalents','amount','closing'],
 ['cash_movement','Net cash movement','amount','period'],['operating_cash','Operating cash flow','amount','period'],['investing_cash','Investing cash flow','amount','period'],['financing_cash','Financing cash flow','amount','period'],['unclassified_cash','Unclassified cash flow','amount','period']
].map(([key,label,format,basis])=>({key,label,format,basis}));
const classes=['assets','liabilities','equity','revenue','cogs','operating_expenses','other_result','income_tax'];
const cashFields={operating_cash:'cash_operating',investing_cash:'cash_investing',financing_cash:'cash_financing',unclassified_cash:'cash_unclassified'};
export const comparisonSums=['debit_units','credit_units','cash_units',...Object.values(cashFields)];
export function companyComparison(source,branchIds,from,to,unit,decimals){
 const before=source.before.rows.filter(r=>branchIds.includes(r.branch_id)),period=source.period.rows.filter(r=>branchIds.includes(r.branch_id));
 const opening={groups:Object.fromEntries(classes.map(c=>[c,0])),cash_units:0};
 const sum=(rows,field)=>reportUnits(rows.reduce((n,r)=>reportUnits(n+reportUnits(r['sum_'+field])),0));
 for(const r of before){opening.groups[r.classification]=reportUnits(opening.groups[r.classification]+reportUnits(r.sum_debit_units)-reportUnits(r.sum_credit_units));opening.cash_units=reportUnits(opening.cash_units+reportUnits(r.sum_cash_units));}
 if(reportUnits(sum(before,'debit_units')+sum(period,'debit_units'))!==reportUnits(sum(before,'credit_units')+sum(period,'credit_units')))throw new Error('Comparison scope is not balanced. Reconcile the reporting index first.');
 const trend=financialTrend(period,opening,from,to,unit,decimals).map(r=>({...r,operating_profit:r.revenue-r.cogs-r.expenses}));
 const values={};for(const key of ['revenue','cogs','expenses','gross_profit','operating_profit','net_profit','cash_movement'])values[key]=trend.reduce((n,r)=>reportUnits(n+Math.round(r[key]*10**decimals)),0)/10**decimals;
 for(const key of ['assets','liabilities','equity','closing_cash'])values[key]=trend.at(-1)[key];
 for(const [key,field]of Object.entries(cashFields))values[key]=sum(period,field)/10**decimals;
 return {values,trend,recorded_lines:period.reduce((n,r)=>n+Number(r.count||0),0)};
}
export function combineComparisons(parts,decimals){
 const scale=10**decimals,keys=comparisonMetrics.filter(m=>m.format==='amount').map(m=>m.key);
 const values=Object.fromEntries(keys.map(key=>[key,parts.reduce((n,p)=>reportUnits(n+Math.round(p.values[key]*scale)),0)/scale]));
 for(const [key,profit] of [['gross_margin','gross_profit'],['operating_margin','operating_profit'],['net_margin','net_profit']])values[key]=values.revenue>0?100*values[profit]/values.revenue:null;
 const trend=parts[0].trend.map((r,index)=>({period:r.period,...Object.fromEntries(['revenue','cogs','expenses','gross_profit','operating_profit','net_profit','cash_movement','closing_cash','assets','liabilities','equity'].map(key=>[key,parts.reduce((n,p)=>reportUnits(n+Math.round(p.trend[index][key]*scale)),0)/scale]))}));
 return {values,trend,recorded_lines:parts.reduce((n,p)=>n+p.recorded_lines,0)};
}