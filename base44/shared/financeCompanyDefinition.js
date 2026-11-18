import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
export async function saveFinanceCompanyDefinition(ctx,company,input){
 financePermission(ctx,'finance_company_manage');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Company definition requires unrestricted branch access.',403);
 const data=input.data||{},expected=input.expected||{};
 requireValue(expected.name===company.name&&(expected.registration_number||'')===(company.registration_number||'')&&expected.is_test===!!company.is_test,'Company definition changed. Reopen this view before saving.',409);
 requireValue(typeof data.name==='string'&&data.name.trim().length>0&&data.name.trim().length<=200,'Enter the real legal company name (up to 200 characters).');
 requireValue(typeof data.registration_number==='string'&&data.registration_number.length<=100,'Registration number must be no longer than 100 characters.');
 requireValue(typeof data.is_test==='boolean','Choose the company environment.');
 if(data.is_test!==!!company.is_test){
  requireValue(input.confirm_environment_change===true,'Confirm the environment change. Existing accounting data will be retained.');
  requireValue(!await ctx.svc.entities.FinanceCompany.count({id:{$ne:company.id},branch_ids:{$in:company.branch_ids},is_test:data.is_test}),'A selected branch already belongs to another finance company in the chosen environment.');
 }
 const saved=await ctx.svc.entities.FinanceCompany.update(company.id,{name:data.name.trim(),registration_number:data.registration_number.trim(),is_test:data.is_test});
 const {write_token,...details}=saved;return {company:details};
}