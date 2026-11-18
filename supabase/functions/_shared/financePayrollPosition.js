import { analyticsScope,reportUnits } from './financeAnalyticsScope.js';
import { payrollAccess } from './financeTaxSources.js';
import { requireValue } from './financeValidation.js';
import { payrollReconciliation } from './financePayrollReconciliation.js';
const amounts=['gross_salary','bonus','net_salary','attendance_deductions','deductions','penalty_deductions','borrowing_deductions','tax_withheld_amount'];
export async function payrollPosition(ctx,company,input){
 payrollAccess(ctx);
 requireValue(company.currency==='EGP','Payroll reporting requires an EGP company. Currency conversion figures are not inferred.');
 const scope=await analyticsScope(ctx,company,input),query={...scope.branchScope,month:{$gte:scope.from,$lte:scope.to}},scale=10**company.currency_decimals;
 const [page,totals,missing,duplicates]=await Promise.all([
  ctx.svc.entities.SalaryRecord.filter(query,{sort:'-month',limit:50,fields:['employee_id','employee_name','branch_id','branch_name','month','payment_status','tax_withholding_note','updated_date',...amounts],...(input.cursor?{cursor:input.cursor}:{})}),
  ctx.svc.entities.SalaryRecord.aggregate({query,groupBy:'payment_status',sum:amounts,limit:20}),
  ctx.svc.entities.SalaryRecord.count({...query,$or:[{tax_withheld_amount:{$exists:false}},{tax_withheld_amount:null}]}),
  ctx.svc.entities.SalaryRecord.aggregate({query,groupBy:['branch_id','employee_id','month'],having:{count:{$gt:1}},limit:50})
 ]);
 requireValue(!totals.truncated,'Payroll position totals were truncated. Narrow the dates or branch.');
 const units=value=>{const n=Number(value??0);requireValue(Number.isFinite(n),'Payroll contains an invalid monetary value.');return reportUnits(Math.round(n*scale));};
 const summary={records:totals.rows.reduce((n,r)=>n+Number(r.count||0),0),missing_withholding:missing,duplicate_groups:duplicates.rows.length,duplicates_truncated:!!duplicates.truncated,totals_valid:!duplicates.rows.length&&!duplicates.truncated};
 for(const field of amounts)summary[field+'_units']=totals.rows.reduce((n,r)=>reportUnits(n+units(r['sum_'+field])),0);
 summary.withholding_known=summary.records-missing;
 summary.payment_statuses=await Promise.all(totals.rows.map(async r=>({status:r.payment_status||'Not recorded',records:Number(r.count||0),known:await ctx.svc.entities.SalaryRecord.count({...query,payment_status:r.payment_status??null,tax_withheld_amount:{$gte:0}}),withheld_units:units(r.sum_tax_withheld_amount)})));
 const items=await payrollReconciliation(ctx,company,scope,page.items,summary.totals_valid);
 return {...page,items,summary,from:scope.from,to:scope.to,currency:company.currency,refreshed_at:new Date().toISOString()};
}