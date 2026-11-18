import { reportUnits } from './financeAnalyticsScope.js';
import { requireValue } from './financeValidation.js';
export async function payrollReconciliation(ctx,company,scope,items,totalsValid){
 if(!items.length)return items;
 const page=await ctx.svc.entities.FinanceTaxAssessment.filter({company_id:company.id,kind:'payroll',source_entity:'SalaryRecord',source_id:{$in:items.map(r=>r.id)},...scope.branchScope},{limit:100,fields:['source_id','source_version','branch_id','employee_id','entry_date','currency','tax_units','evidence_note']});
 requireValue(!page.has_more,'Duplicate payroll assessments exceed the reconciliation limit; resolve them before using this report.');
 const bySource=new Map();for(const a of page.items){const matches=bySource.get(a.source_id)||[];matches.push(a);bySource.set(a.source_id,matches);}
 return items.map(r=>{
  const matches=bySource.get(r.id)||[],a=matches[0],known=typeof r.tax_withheld_amount==='number'&&Number.isFinite(r.tax_withheld_amount)&&r.tax_withheld_amount>=0;
  const recorded=known?reportUnits(Math.round(r.tax_withheld_amount*10**company.currency_decimals)):null;
  const calculated=a&&Number.isSafeInteger(a.tax_units)&&a.tax_units>=0?a.tax_units:null;
  const changed=a&&(a.source_version!==r.updated_date||a.entry_date!==r.month||a.branch_id!==r.branch_id||a.employee_id!==r.employee_id||a.currency!==company.currency);
  const missingEvidence=!String(r.tax_withholding_note||'').trim()||a&&!String(a.evidence_note||'').trim();
  const status=!totalsValid?'duplicate_payroll':!a?'unassessed':matches.length!==1?'duplicate_assessment':changed?'source_changed':calculated===null?'invalid_estimate':!known?'missing_withholding':missingEvidence?'missing_evidence':'reviewed';
  return {...r,tax_reconciliation:{assessment_id:a?.id||null,calculated_units:calculated,recorded_units:recorded,difference_units:status==='reviewed'?reportUnits(calculated-recorded):null,status,missing_evidence:!!missingEvidence}};
 });
}