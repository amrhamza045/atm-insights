import { analyticsScope,reportUnits } from './financeAnalyticsScope.js';
import { requireValue } from './financeValidation.js';
export async function withholdingSchedule(ctx,company,input){
 const scope=await analyticsScope(ctx,company,input),query={company_id:company.id,kind:'invoice',...scope.branchScope,entry_date:{$gte:scope.from,$lte:scope.to}};
 const [result,missing_evidence]=await Promise.all([ctx.svc.entities.FinanceTaxAssessment.aggregate({query,groupBy:['direction','counterparty_tax_id','counterparty_name','recorded_tax_known','missing_counterparty_id'],sum:['base_units','tax_units','recorded_tax_units'],limit:1000}),ctx.svc.entities.FinanceTaxAssessment.count({...query,$or:[{evidence_note:{$exists:false}},{evidence_note:null},{evidence_note:{$regex:'^\\s*$'}}]})]);
 requireValue(!result.truncated,'The withholding schedule exceeds the complete-report limit. Narrow dates or select a branch; partial counterparty totals are not shown.');
 const schedules=new Map();
 for(const r of result.rows){
  requireValue(['sales','purchases'].includes(r.direction),'An invoice assessment has an invalid withholding direction. Review the assessment.');
  const key=JSON.stringify([r.direction,r.counterparty_tax_id||'',r.counterparty_name||'']);
  let row=schedules.get(key);if(!row){row={id:key,direction:r.direction,name:r.counterparty_name||'Unidentified counterparty group',tax_id:r.counterparty_tax_id||'',records:0,base_units:0,tax_units:0,recorded_units:0,missing_recorded:0,missing_identity:0};schedules.set(key,row);}
  const count=Number(r.count||0);row.records+=count;
  for(const [target,source] of [['base_units','base_units'],['tax_units','tax_units']])row[target]=reportUnits(row[target]+reportUnits(r['sum_'+source]));
  if(r.recorded_tax_known===true)row.recorded_units=reportUnits(row.recorded_units+reportUnits(r.sum_recorded_tax_units));else row.missing_recorded+=count;
  if(r.missing_counterparty_id===true)row.missing_identity+=count;
 }
 const items=[...schedules.values()].map(row=>({...row,difference_units:row.missing_recorded?null:reportUnits(row.tax_units-row.recorded_units)})).sort((a,b)=>a.direction.localeCompare(b.direction)||a.name.localeCompare(b.name)||a.tax_id.localeCompare(b.tax_id));
 return {items,missing_evidence,from:scope.from,to:scope.to,currency:company.currency,refreshed_at:new Date().toISOString()};
}