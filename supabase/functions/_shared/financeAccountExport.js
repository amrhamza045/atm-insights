import { accountRecords } from './financeAccountModel.js';
export async function financeAccountExport(ctx,company){
 const accounts=await accountRecords(ctx.svc.entities.FinanceAccount,{company_id:company.id});
 const fields=['code','name','name_ar','parent_code','classification','normal_balance','posting','active','management_mapping','statutory_mapping','effective_from','effective_to','report_cash_equivalent','report_cash_flow_section'];
 return {company_name:company.name,exported_at:new Date().toISOString(),rows:accounts.sort((a,b)=>a.code.localeCompare(b.code)).map(a=>Object.fromEntries(fields.map(field=>[field,a[field]??(field==='active'?true:field==='report_cash_equivalent'||field==='report_cash_flow_section'?'auto':'')])))};
}