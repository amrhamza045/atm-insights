import { requireValue } from './financeValidation.js';
import { reportUnits } from './financeAnalyticsScope.js';
const CLASSES=['assets','liabilities','equity','revenue','cogs','operating_expenses','other_result','income_tax'];
export function financialTrend(groups,opening,from,to,unit,decimals){
 const buckets=new Map(),start=new Date(`${from.slice(0,7)}-01T00:00:00Z`),end=new Date(`${to}T00:00:00Z`),key=d=>unit==='year'?String(d.getUTCFullYear()):unit==='quarter'?`${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth()/3)+1}`:d.toISOString().slice(0,7);
 for(let d=new Date(start);d<=end;d.setUTCMonth(d.getUTCMonth()+1)){const k=key(d);if(!buckets.has(k))buckets.set(k,{period:k,through:'',count:0,cash:0,groups:Object.fromEntries(CLASSES.map(c=>[c,0]))});const row=buckets.get(k),last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10);row.through=last<to?last:to;}
 requireValue(buckets.size<=240,'Choose a period with at most 240 display buckets.');
 for(const r of groups){const d=new Date(String(r.entry_date).slice(0,10)+'T00:00:00Z'),b=buckets.get(key(d));requireValue(b&&CLASSES.includes(r.classification),'Invalid financial trend bucket.');b.count+=Number(r.count||0);b.groups[r.classification]+=reportUnits(r.sum_debit_units)-reportUnits(r.sum_credit_units);b.cash+=reportUnits(r.sum_cash_units);}
 const running={...opening.groups},scale=10**decimals;let cash=opening.cash_units;
 return [...buckets.values()].map(b=>{for(const c of CLASSES)running[c]=reportUnits(running[c]+b.groups[c]);cash=reportUnits(cash+b.cash);const g=b.groups,revenue=-g.revenue,cogs=g.cogs,expenses=g.operating_expenses,profit=revenue-cogs-expenses-g.other_result-g.income_tax,earnings=-running.revenue-running.cogs-running.operating_expenses-running.other_result-running.income_tax;
 const values={revenue,cogs,expenses,gross_profit:revenue-cogs,net_profit:profit,cash_movement:b.cash,closing_cash:cash,assets:running.assets,liabilities:-running.liabilities,equity:-running.equity+earnings};return {period:b.period,through:b.through,recorded_lines:b.count,...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,reportUnits(v)/scale]))};});
}