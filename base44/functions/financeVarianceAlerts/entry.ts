import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { financeContext } from '../../shared/financeAccess.js';
import { varianceConfig } from '../../shared/financeVarianceAccess.js';
import { readVarianceSettings,saveVarianceSettings } from '../../shared/financeVarianceSettings.js';
import { prepareVarianceAlert,finishVarianceAlert,releaseVarianceAlert } from '../../shared/financeVarianceEvaluation.js';
import { requireValue } from '../../shared/financeValidation.js';
export default async function(req){
 let ctx,config,input;
 try{
  const base44=createClientFromRequest(req);ctx=await financeContext(base44);input=await req.json();config=await varianceConfig(ctx);
  if(input.action==='get')return Response.json(await readVarianceSettings(ctx,config));
  if(input.action==='save')return Response.json(await saveVarianceSettings(ctx,config,input));
  requireValue(ctx.user.role==='admin','Scheduled variance evaluation requires an administrator.',403);
  if(input.action==='evaluate')return Response.json(await prepareVarianceAlert(base44,config,input.dry_run===true));
  requireValue(typeof input.token==='string'&&input.token&&typeof input.week==='string','A workflow delivery token and period are required.');
  if(input.action==='finish')return Response.json(await finishVarianceAlert(ctx,config,input));
  if(input.action==='release')return Response.json(await releaseVarianceAlert(ctx,config,input));
  return Response.json({error:'Unknown variance alert action.'},{status:400});
 }catch(error){
  if(ctx?.admin&&config&&input?.action==='evaluate'&&!input.dry_run)await ctx.svc.entities.FinanceVarianceAlertConfig.updateMany({id:config.id,revision:config.revision},{$set:{last_checked_at:new Date().toISOString(),last_outcome:'blocked',last_note:String(error.message).slice(0,500)}});
  console.error('Branch variance alert action failed:',error.message);
  return Response.json({error:error.message},{status:error.status||500});
 }
}