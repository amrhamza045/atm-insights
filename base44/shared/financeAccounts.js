import { MASTER_ACCOUNTS, TEMPLATE_VERSION } from './financeTemplate.js';
import { requireValue } from './financeValidation.js';
import { accountRecords,accountDefinition,validateAccountHierarchy,protectAccountChange } from './financeAccountModel.js';
import { financeAccountReferences } from './financeAccountReferences.js';
import { invalidateAccountReports } from './financeAccountInvalidation.js';
import { financePermission } from './financeAccess.js';
export async function installFinanceTemplate(ctx,company) {
 financePermission(ctx,'finance_accounts_manage');
 const existing=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id},{distinct:'code',limit:200});
 requireValue(!existing.has_more,'Use an account audit before installing into a chart exceeding 200 accounts.');
 const codes=new Set(existing.items);
 const missing=MASTER_ACCOUNTS.filter(a=>!codes.has(a.code)).map(a=>({...a,company_id:company.id,account_key:`${company.id}:${a.code}`,active:true,statutory_mapping:'',template_version:TEMPLATE_VERSION}));
 if(missing.length) await ctx.svc.entities.FinanceAccount.bulkCreate(missing);
 return {added:missing.length};
}
export async function saveFinanceAccount(ctx,company,data,id) {
 financePermission(ctx,'finance_accounts_manage');
 const chart=await accountRecords(ctx.svc.entities.FinanceAccount,{company_id:company.id}),existing=id?chart.find(a=>a.id===id):null;
 requireValue(!id||existing,'Account not found in this company.',404);requireValue(!existing||!data.expected_updated_date||existing.updated_date===data.expected_updated_date,'This account changed. Close and reopen it before saving.',409);
 const clean=accountDefinition(company,data,existing),refs=existing?await financeAccountReferences(ctx,company,[existing]):new Map();protectAccountChange(existing,clean,refs.get(id));
 const next=chart.filter(a=>a.id!==id).map(a=>existing&&existing.code!==clean.code&&a.parent_code===existing.code?{...a,parent_code:clean.code}:a);next.push({...clean,id});validateAccountHierarchy(next);
 await invalidateAccountReports(ctx,company,existing,clean);
 const account=existing?await ctx.svc.entities.FinanceAccount.update(id,clean):await ctx.svc.entities.FinanceAccount.create(clean);
 if(existing&&existing.code!==clean.code){const children=chart.filter(a=>a.parent_code===existing.code);for(let start=0;start<children.length;start+=4)await Promise.all(children.slice(start,start+4).map(a=>ctx.svc.entities.FinanceAccount.update(a.id,{parent_code:clean.code})));}
 return {account};
}