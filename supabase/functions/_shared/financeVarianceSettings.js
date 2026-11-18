import { varianceOwner,varianceTargets } from './financeVarianceAccess.js';
import { requireValue } from './financeValidation.js';
import { audit } from './auditLog.js';
export async function readVarianceSettings(ctx,config){
 if(!config||config.owner_user_id!==ctx.user.id)return {can_configure:false};
 const query={id:{$in:config.targets.map(t=>t.company_id)},...(ctx.admin?{}:{member_emails:ctx.user.email.toLowerCase()})};
 const companies=await ctx.svc.entities.FinanceCompany.filter(query,{limit:6});
 const allowed=new Map(companies.items.map(c=>[c.id,c]));
 const targets=config.targets.map(t=>{const c=allowed.get(t.company_id),accessible=c?.branch_ids.includes(t.branch_id)&&(ctx.admin||!ctx.permissions.branch_id||ctx.permissions.branch_id===t.branch_id);return {...t,label:accessible?t.label:'Unavailable branch'};});
 return {can_configure:true,recipient:ctx.user.email,config:{enabled:config.enabled,targets,threshold_pp:10,last_checked_at:config.last_checked_at,last_period:config.last_period,last_outcome:config.last_outcome,last_note:config.last_note}};
}
export async function saveVarianceSettings(ctx,config,input){
 varianceOwner(ctx,config);requireValue(typeof input.enabled==='boolean','Choose whether the alerts are enabled.');
 const targets=input.enabled?(await varianceTargets(ctx,input.targets)).targets:config.targets;
 await ctx.svc.entities.FinanceVarianceAlertConfig.update(config.id,{enabled:input.enabled,targets,threshold_pp:10,revision:crypto.randomUUID()});
 await audit(ctx.base44,ctx.user,'update','FinanceVarianceAlertConfig',input.enabled?'Enabled weekly branch variance email alerts':'Paused weekly branch variance email alerts',{entityId:config.id,changes:{branch_count:targets.length,threshold_pp:10}});
 return {saved:true};
}