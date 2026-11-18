export function varianceWeek(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 const today=`${parts.year}-${parts.month}-${parts.day}`,d=new Date(`${today}T00:00:00Z`);
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7-1);
 const to=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()-6);
 return {from:d.toISOString().slice(0,10),to};
}
export function branchVariances(report,threshold=10){
 if(!report.ready)return {blocked:true,reason:report.message||'Ledgers need preparation.',alerts:[]};
 if(report.rows.some(r=>!r.recorded_lines||r.pending||r.posting_issues||!(r.values.revenue>0)))return {blocked:true,reason:'Selected branches have missing activity, non-positive revenue, pending proposals or blocked postings. No partial comparison is used.',alerts:[]};
 const alerts=[];
 for(const row of report.rows){
  const peers=report.rows.filter(r=>r.id!==row.id),revenue=peers.reduce((n,r)=>n+r.values.revenue,0);
  if(!(revenue>0))return {blocked:true,reason:'A positive-revenue peer baseline is unavailable.',alerts:[]};
  const peerMargin=100*peers.reduce((n,r)=>n+r.values.net_profit,0)/revenue,peerCost=100*peers.reduce((n,r)=>n+r.values.expenses,0)/revenue;
  const margin=100*row.values.net_profit/row.values.revenue,cost=100*row.values.expenses/row.values.revenue;
  const lowMargin=peerMargin-margin>=threshold,highCost=cost-peerCost>=threshold;
  if(lowMargin||highCost)alerts.push({label:row.label,margin,peerMargin,cost,peerCost,lowMargin,highCost});
 }
 return {blocked:false,alerts};
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function varianceFindings(alerts){
 return alerts.map(a=>`${escape(a.label)}\n${a.lowMargin?`Net margin ${a.margin.toFixed(2)}% vs peers ${a.peerMargin.toFixed(2)}%: ${(a.peerMargin-a.margin).toFixed(2)} percentage points lower.\n`:''}${a.highCost?`Operating costs / revenue ${a.cost.toFixed(2)}% vs peers ${a.peerCost.toFixed(2)}%: ${(a.cost-a.peerCost).toFixed(2)} percentage points higher.`:''}`).join('\n\n');
}