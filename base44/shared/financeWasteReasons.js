import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
export const WASTE_GROUPS=['expired','damaged','spoiled','overproduction','preparation_error','other'];
const ACCOUNT_CLASSES=['cogs','operating_expenses','other_result'];
export function wasteReasonAccount(company,account){
 requireValue(account?.company_id===company.id&&account.active&&account.posting&&ACCOUNT_CLASSES.includes(account.classification),'Select an active cost-of-sales or expense posting account in this company.');
}
export async function financeWasteReasons(ctx,company,input){
 const entity=ctx.svc.entities.FinanceWasteReason;
 requireValue(!input.search||typeof input.search==='string'&&input.search.length<=80,'Search must be at most 80 characters.');
 if(input.action==='waste_reasons'){
  const search=String(input.search||'').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return entity.filter({company_id:company.id,...(search?{$or:[{name:{$regex:search,$options:'i'}},{code:{$regex:search,$options:'i'}}]}:{})},{sort:'name',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
 }
 financePermission(ctx,'finance_accounts_manage');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Waste-reason configuration requires unrestricted company access.',403);
 const previous=input.id?await entity.get(input.id):null;
 if(previous){requireValue(previous.company_id===company.id,'Waste reason is outside this company.',403);requireValue(previous.updated_date===input.expected_updated_date,'Waste reason changed. Reload before saving.',409);}
 if(input.action==='waste_reason_toggle'){
  requireValue(previous&&typeof input.is_active==='boolean','Choose a waste reason and active state.');
  if(input.is_active)wasteReasonAccount(company,await ctx.svc.entities.FinanceAccount.get(previous.account_id));
  return {reason:await entity.update(previous.id,{is_active:input.is_active})};
 }
 requireValue(input.action==='waste_reason_save','Unknown waste-reason action.');
 const data=input.data||{},code=String(data.code||'').trim().toLowerCase(),name=String(data.name||'').trim();
 requireValue(/^[a-z][a-z0-9_]{0,79}$/.test(code),'Use a stable code starting with a letter, followed by letters, numbers or underscores.');
 requireValue(name.length>0&&name.length<=120,'Enter a name up to 120 characters.');
 requireValue(!previous||previous.code===code,'Reason codes cannot be changed; create a new reason instead.');
 requireValue(WASTE_GROUPS.includes(data.reason_group),'Choose a reporting group.');
 requireValue(typeof data.account_id==='string'&&data.account_id,'Select a GL account.');
 requireValue(!await entity.count({company_id:company.id,code,...(previous?{id:{$ne:previous.id}}:{})}),'That reason code already exists in this company.',409);
 const account=await ctx.svc.entities.FinanceAccount.get(data.account_id);wasteReasonAccount(company,account);
 requireValue(!data.treatment||['waste','food_tasting'].includes(data.treatment),'Choose waste or food tasting.');
 const clean={company_id:company.id,code,name,reason_group:data.reason_group,treatment:data.treatment||'waste',account_id:account.id,account_code:account.code,account_name:account.name};
 return {reason:previous?await entity.update(previous.id,clean):await entity.create({...clean,is_active:true})};
}