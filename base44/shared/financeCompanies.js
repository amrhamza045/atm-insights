import { financePermission } from './financeAccess.js';
import { requireValue, validDate } from './financeValidation.js';
export async function createFinanceCompany(ctx,data) {
 financePermission(ctx,'finance_company_manage');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Company setup requires unrestricted branch access.',403);
 requireValue(typeof data.name==='string'&&data.name.trim(),'Legal company name is required.');
 requireValue(/^[A-Z]{3}$/.test(data.currency||''),'Enter a three-letter currency code.');
 requireValue([0,2,3].includes(Number(data.currency_decimals)),'Choose 0, 2 or 3 currency decimals.');
 requireValue(['fnb','central_kitchen','supermarket','pharmacy'].includes(data.edition),'Select a business edition.');
 requireValue(Array.isArray(data.branch_ids)&&data.branch_ids.length<=50,'Select up to 50 branches.');
 const ids=[...new Set(data.branch_ids)];
 if(ids.length){
  const branches=await ctx.svc.entities.Branch.filter({id:{$in:ids}},{limit:50});
  requireValue(branches.items.length===ids.length,'One or more branches do not exist.');
  requireValue(!await ctx.svc.entities.FinanceCompany.count({branch_ids:{$in:ids},is_test:!!data.is_test}),'A selected branch already belongs to another finance company in this environment.');
 }
 return {company:await ctx.svc.entities.FinanceCompany.create({name:data.name.trim(),company_code:String(data.company_code||''),is_active:true,registration_number:String(data.registration_number||''),currency:data.currency,currency_decimals:Number(data.currency_decimals),edition:data.edition,branch_ids:ids,member_emails:emails(data.member_emails||[]),is_test:!!data.is_test,history_status:'reconstruction_in_progress',closed_through:'',write_token:''})};
}
function emails(input) {
 requireValue(Array.isArray(input)&&input.length<=100,'Provide up to 100 member email addresses.');
 const values=[...new Set(input.map(s=>String(s).trim().toLowerCase()).filter(Boolean))];
 requireValue(values.every(s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),'A member email is invalid.');return values;
}
export async function updateFinanceCompany(ctx,company,data) {
 financePermission(ctx,'finance_company_manage');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Company setup requires unrestricted branch access.',403);
 return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{member_emails:emails(data.member_emails)})};
}
export async function lockFinancePeriod(ctx,company,data) {
 financePermission(ctx,'finance_period_close');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Period locks require unrestricted branch access.',403);
 requireValue(validDate(data.closed_through),'Choose a valid close-through date.');
 requireValue(!company.closed_through||data.closed_through>company.closed_through,'The lock date can only move forward.');
 requireValue(data.closed_through<=new Date().toISOString().slice(0,10),'Cannot close a future period.');
 requireValue(typeof data.reason==='string'&&data.reason.trim(),'Document the reason for locking this period.');
 requireValue(data.confirmed===true,'Confirm reconciliation and historical reconstruction for this period before locking.');
 const pending=await ctx.svc.entities.FinanceProposal.count({company_id:company.id,status:'pending',entry_date:{$lte:data.closed_through}});
 requireValue(!pending,'Resolve pending proposals in this period before locking.');
  const issues=await ctx.svc.entities.FinancePostingIssue.count({company_id:company.id,status:'open',entry_date:{$lte:data.closed_through}});
  requireValue(!issues,'Resolve blocked automatic postings in this period before locking.');
 return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{closed_through:data.closed_through,lock_reason:data.reason.trim(),locked_by:ctx.user.email,locked_at:new Date().toISOString()})};
}