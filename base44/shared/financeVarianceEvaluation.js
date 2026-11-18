import { varianceRecipient,varianceTargets } from './financeVarianceAccess.js';
import { financeComparison } from './financeComparison.js';
import { varianceWeek,branchVariances,varianceFindings } from './financeVarianceRules.js';
export async function prepareVarianceAlert(base44,config,dryRun=false){
 if(!config?.enabled)return {should_send:false,reason:'Alerts are paused. Select branches and enable them in Entity comparisons.'};
 const ctx=await varianceRecipient(base44,config),scope=await varianceTargets(ctx,config.targets),week=varianceWeek();
 if(!dryRun&&config.delivery_week===week.to)return {should_send:false,reason:'This week already has a prepared or sent alert.'};
 const report=await financeComparison(ctx,scope.anchor,{...week,unit:'month',targets:scope.targets}),result=branchVariances(report,10);
 const note=result.blocked?result.reason:result.alerts.length?`${result.alerts.length} branches exceeded the 10-percentage-point threshold.`:'No selected branch exceeded the threshold.';
 const entity=ctx.svc.entities.FinanceVarianceAlertConfig,metadata={last_checked_at:new Date().toISOString(),last_period:`${week.from} to ${week.to}`,last_outcome:result.blocked?'blocked':result.alerts.length?'prepared':'no_variance',last_note:note};
 if(dryRun)return {should_send:false,dry_run:true,...week,...result,note};
 if(result.blocked||!result.alerts.length){await entity.updateMany({id:config.id,revision:config.revision},{$set:metadata});return {should_send:false,reason:note};}
 // Revalidate the recipient and every branch after report preparation. The
 // recipient is resolved from a registered user, never from caller input.
 const currentCtx=await varianceRecipient(base44,config);await varianceTargets(currentCtx,config.targets);
 const token=crypto.randomUUID();
 await entity.updateMany({id:config.id,revision:config.revision,enabled:true,delivery_week:{$ne:week.to}},{$set:{...metadata,delivery_week:week.to,delivery_state:'prepared',delivery_token:token}});
 const fresh=await entity.get(config.id);
 if(fresh.delivery_token!==token||fresh.revision!==config.revision||!fresh.enabled)return {should_send:false,reason:'Configuration changed or another run claimed this week.'};
 return {should_send:true,to:currentCtx.user.email,token,week:week.to,variables:{alert_count:String(result.alerts.length),...week,findings:varianceFindings(result.alerts)}};
}
export async function finishVarianceAlert(ctx,config,input){
 if(!config)return {recorded:false};
 await ctx.svc.entities.FinanceVarianceAlertConfig.updateMany({id:config.id,delivery_token:input.token,delivery_week:input.week,delivery_state:'prepared'},{$set:{delivery_state:'sent',last_outcome:'sent',last_note:'Weekly variance alert delivered by the email workflow.'}});
 return {recorded:true};
}
export async function releaseVarianceAlert(ctx,config,input){
 if(config)await ctx.svc.entities.FinanceVarianceAlertConfig.updateMany({id:config.id,delivery_token:input.token,delivery_week:input.week,delivery_state:'prepared'},{$set:{delivery_week:'',delivery_token:'',last_outcome:'dry_run',last_note:'Workflow dry run completed; no email sent and no weekly delivery slot consumed.'}});
 return {released:true};
}