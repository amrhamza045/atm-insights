import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { financeContext } from '../_shared/financeAccess.js';
import { varianceConfig } from '../_shared/financeVarianceAccess.js';
import { readVarianceSettings,saveVarianceSettings } from '../_shared/financeVarianceSettings.js';
import { prepareVarianceAlert,finishVarianceAlert,releaseVarianceAlert } from '../_shared/financeVarianceEvaluation.js';
import { requireValue } from '../_shared/financeValidation.js';
async function handler(req){
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
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
