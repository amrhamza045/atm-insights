import { financeCompany,financeBranch } from './financeAccess.js';
import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { requireValue } from './financeValidation.js';
export async function varianceConfig(ctx){
 const page=await ctx.svc.entities.FinanceVarianceAlertConfig.filter({setting_key:'weekly_branch_variance'},{limit:2});
 requireValue(page.items.length<=1&&!page.has_more,'Duplicate variance alert configurations must be resolved.');
 return page.items[0]||null;
}
export function varianceOwner(ctx,config){requireValue(config&&config.owner_user_id===ctx.user.id,'These email alerts can only be configured by their owner.',403);}
export async function varianceRecipient(base44,config){
 const svc=base44.asServiceRole,user=await svc.entities.User.get(config.owner_user_id);
 requireValue(user?.email,'The alert recipient is no longer a registered app user.',403);
 const permissions=await getEffectivePermissions(base44,user),admin=user.role==='admin';
 requireValue(admin||(!permissions.access_denied&&permissions.financial_view&&!permissions.disabled_modules?.includes('financial')),'The recipient no longer has financial access.',403);
 return {base44,svc,user,permissions,admin};
}
export async function varianceTargets(ctx,targets){
 requireValue(Array.isArray(targets)&&targets.length>=2&&targets.length<=6,'Select two to six branches from your access list.');
 const clean=[],seen=new Set();let anchor;
 for(const t of targets){
  requireValue(t?.type==='branch'&&typeof t.company_id==='string'&&typeof t.branch_id==='string'&&t.branch_id,'Only individual branches can be monitored.');
  requireValue(!seen.has(t.branch_id),'Remove duplicate branches.');seen.add(t.branch_id);
  const company=await financeCompany(ctx,t.company_id);financeBranch(ctx,company,t.branch_id);

  requireValue(!anchor||company.currency===anchor.currency,'Select branches with the same currency. Currency conversion is not inferred.');anchor=anchor||company;
  const branch=await ctx.svc.entities.Branch.get(t.branch_id);requireValue(branch,'A selected branch no longer exists.',404);
  clean.push({type:'branch',company_id:company.id,branch_id:branch.id,label:`${company.name} / ${branch.name}`});
 }
 return {anchor,targets:clean};
}