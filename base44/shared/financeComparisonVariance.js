export function comparisonVariance(rows,decimals){
 const metrics=[
  {key:'net_profit',label:'Net profit variance',format:'amount'},
  {key:'gross_margin',label:'Gross margin variance',format:'points'},
  {key:'operating_margin',label:'Operating margin variance',format:'points'},
  {key:'net_margin',label:'Net margin variance',format:'points'},
  {key:'operating_cost_ratio',label:'Operating-cost ratio variance',format:'points'}
 ];
 const value=(row,key)=>key==='operating_cost_ratio'?(row.values.revenue>0?100*row.values.expenses/row.values.revenue:null):row.values[key];
 const finite=n=>typeof n==='number'&&Number.isFinite(n),scale=10**decimals;
 return {metrics,baselines:rows.map(baseline=>({baseline_id:baseline.id,baseline_label:baseline.label,rows:rows.map(row=>({id:row.id,label:row.label,deltas:Object.fromEntries(metrics.map(m=>{
  const actual=value(row,m.key),reference=value(baseline,m.key);
  const delta=!row.recorded_lines||!baseline.recorded_lines||!finite(actual)||!finite(reference)?null:m.format==='amount'?(Math.round(actual*scale)-Math.round(reference*scale))/scale:actual-reference;
  return [m.key,delta];
 }))}))}))};
}