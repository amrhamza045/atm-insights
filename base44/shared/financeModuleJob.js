import { financeCompany, withFinanceLock } from './financeAccess.js';
import { purchasePostingCompanies } from './financeMappedPurchase.js';
import { requireValue } from './financeValidation.js';
import { moduleSource, postModule, moduleIssue } from './financeModulePosting.js';
import { getCompanyOffset, dayInOffset, TIMEZONE_MISSING } from './companyTimezone.js';
export async function runModuleJob(ctx,input){
 requireValue(['Order','PurchaseInvoice'].includes(input.source_entity),'Unsupported transaction source.');const source=await ctx.svc.entities[input.source_entity].get(input.source_id);requireValue(source,'Source no longer exists.',404);
 const owners=input.company_id?{items:[await financeCompany(ctx,input.company_id)]}:input.source_entity==='PurchaseInvoice'?await purchasePostingCompanies(ctx,source):await ctx.svc.entities.FinanceCompany.filter({is_active:{$ne:false},'module_policy.enabled':true,branch_ids:source.branch_id},{limit:2});
 requireValue(!owners.has_more,'Resolve multiple enabled company owners before posting.',409);const companies=owners.items;
 requireValue(companies.length<=1,'Resolve multiple enabled company owners before posting.',409);if(!companies.length)return {skipped:true,reason:'No enabled transaction connection for this branch.'};const company=companies[0];await moduleSource(ctx,company,input.source_entity,input.source_id);
 const attempt=Math.min(2,(Number(input.attempt)||0)+1);let date=input.entry_date||'';
 try {if(input.source_entity==='PurchaseInvoice')date=source.invoice_date;else if(input.paid_at){const offset=await getCompanyOffset(ctx.svc.entities);requireValue(offset!==null,TIMEZONE_MISSING);requireValue(Number.isFinite(Date.parse(input.paid_at)),'Payment event timestamp is missing.');date=dayInOffset(input.paid_at,offset);}
 const post=fresh=>postModule(ctx,fresh,input.source_entity,source,date,input.confirmed_paid===true,{dryRun:input.dry_run===true});
  return {...await (input.dry_run===true?post(company):withFinanceLock(ctx,company,post)),attempt};
 }catch(error){if(![400,409].includes(error.status))throw error;if(input.dry_run!==true)await moduleIssue(ctx,company,input.source_entity,source,date,error.message);return {blocked:true,message:error.message,retry:error.status===409&&attempt<2,attempt};}
}