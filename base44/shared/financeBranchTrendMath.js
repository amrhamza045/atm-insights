import { reportUnits } from './financeAnalyticsScope.js';
const METRICS=['revenue','net_profit','expenses'];
const monthKey=(year,month)=>`${year}-${String(month).padStart(2,'0')}`;
const sum=values=>values.length&&values.every(v=>v!==null)?values.reduce((n,v)=>reportUnits(n+v),0):null;
const mean=values=>{const total=sum(values);return total===null?null:reportUnits(Math.round(total/values.length));};
const difference=(value,base)=>value===null||base===null?null:reportUnits(value-base);
const percent=(value,base)=>value===null||base===null||base<=0?null:(value-base)/base*100;
export function branchTrendRows(groups,branches,year,months,decimals){
 const buckets=new Map(),scale=10**decimals;
 for(const g of groups){
  const key=JSON.stringify([g.branch_id,String(g.entry_date).slice(0,7)]);
  let bucket=buckets.get(key);if(!bucket){bucket={revenue:null,net_profit:0,expenses:null};buckets.set(key,bucket);}
  const movement=reportUnits(reportUnits(g.sum_credit_units)-reportUnits(g.sum_debit_units));bucket.net_profit=reportUnits(bucket.net_profit+movement);
  if(g.classification==='revenue')bucket.revenue=movement;if(g.classification==='operating_expenses')bucket.expenses=-movement;
 }
 const money=n=>n===null?null:n/scale;
 return branches.map(branch=>{
  const value=(y,m,metric)=>buckets.get(JSON.stringify([branch.id,monthKey(y,m)]))?.[metric]??null;
  const summary={},averages={};
  for(const metric of METRICS){
   const current=Array.from({length:months},(_,i)=>value(year,i+1,metric)),previous=Array.from({length:months},(_,i)=>value(year-1,i+1,metric)),actual=sum(current),prior=sum(previous);
   averages[metric]=months===12?mean(current):null;
   summary[metric]={actual:money(actual),prior_year:money(prior),delta:money(difference(actual,prior)),yoy:percent(actual,prior),covered_months:current.filter(v=>v!==null).length};
  }
  const rows=Array.from({length:months},(_,i)=>{
   const month=i+1,metrics={};
   for(const metric of METRICS){
    const actual=value(year,month,metric),prior=value(year-1,month,metric),history=[1,2,3].map(n=>value(year-n,month,metric)),seasonal=mean(history),annual=averages[metric];
    metrics[metric]={actual:money(actual),prior_year:money(prior),delta:money(difference(actual,prior)),yoy:percent(actual,prior),annual_mean:money(annual),annual_delta:money(difference(actual,annual)),annual_variance:percent(actual,annual),seasonal_mean:money(seasonal),seasonal_delta:money(difference(actual,seasonal)),seasonal_variance:percent(actual,seasonal),history_months:history.filter(v=>v!==null).length};
   }
   return {period:monthKey(year,month),metrics};
  });
  return {id:branch.id,name:branch.name,summary,rows};
 });
}