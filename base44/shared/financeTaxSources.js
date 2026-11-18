import { financeBranch } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { analyticsScope } from './financeAnalyticsScope.js';
export function payrollAccess(ctx){requireValue(ctx.admin||ctx.permissions.hr_view_all||ctx.permissions.hr_edit,'HR-wide viewing/editing permission is required for employee payroll tax.',403);}
export function corporateAccess(ctx,input){requireValue(!input.branch_id&&(ctx.admin||!ctx.permissions.branch_id),'Corporate tax is company-wide; clear the branch filter and use company-wide access.',403);}
const sources=['Order','PurchaseInvoice','SalaryRecord'];
export async function taxSource(ctx,company,entity,id){
 requireValue(sources.includes(entity)&&typeof id==='string'&&id,'Choose a sales, purchase or payroll source.');if(entity==='SalaryRecord')payrollAccess(ctx);const record=await ctx.svc.entities[entity].get(id);requireValue(record,'Source record not found.',404);financeBranch(ctx,company,record.branch_id);
 if(entity==='Order')requireValue(['paid','completed'].includes(record.status),'Assess paid/completed sales only.');if(entity==='PurchaseInvoice')requireValue(!record.status||record.status==='posted','Post the purchase invoice before assessing tax.');
 return record;
}
export async function listTaxSources(ctx,company,input){
 requireValue(sources.includes(input.source_entity),'Invalid tax source.');if(input.source_entity==='SalaryRecord')payrollAccess(ctx);const scope=await analyticsScope(ctx,company,input),query={...scope.branchScope},entity=input.source_entity;
 if(entity==='Order'){query.status={$in:['paid','completed']};query.created_date=scope.timestamps;}else if(entity==='PurchaseInvoice'){query.invoice_date={$gte:scope.from,$lte:scope.to};query.$or=[{status:'posted'},{status:{$exists:false}}];}else query.month={$gte:scope.from,$lte:scope.to};
 if(input.search){const text=String(input.search).slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),fields=entity==='Order'?['customer_name']:entity==='PurchaseInvoice'?['invoice_number','supplier_name']:['employee_name'];query.$and=[{$or:fields.map(field=>({[field]:{$regex:text,$options:'i'}}))}];}
 const fields=entity==='Order'?['customer_name','total','created_date','status','branch_name']:entity==='PurchaseInvoice'?['invoice_number','supplier_name','total_amount','invoice_date','branch_name']:['employee_name','employee_id','gross_salary','month','branch_name'];
 const page=await ctx.svc.entities[entity].filter(query,{limit:50,sort:'-created_date',fields,...(input.cursor?{cursor:input.cursor}:{})});return {...page,today:scope.today,from:scope.from,to:scope.to};
}
export async function taxSourceDetails(ctx,company,input){
 const source=await taxSource(ctx,company,input.source_entity,input.source_id),scope=await analyticsScope(ctx,company,{}),assessment=(await ctx.svc.entities.FinanceTaxAssessment.filter({company_id:company.id,source_entity:input.source_entity,source_id:source.id},{limit:1})).items[0]||null;
 const metadata=Object.fromEntries(['id','branch_id','updated_date','customer_name','supplier_name','invoice_number','employee_name','employee_id','gross_salary','month','tax','total','total_amount','tax_withheld_amount','tax_withholding_note'].filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
 if(input.source_entity==='SalaryRecord'&&typeof source.gross_salary==='number')metadata.tax_gross_salary=source.gross_salary+(source.bonus??0);
 return {source:metadata,today:scope.today,assessment,direction:input.source_entity==='Order'?'sales':'purchases',lines:(source.items||[]).map((line,line_index)=>({line_index,name:line.name||line.inventory_item_name||`Line ${line_index+1}`,quantity:line.quantity}))};
}