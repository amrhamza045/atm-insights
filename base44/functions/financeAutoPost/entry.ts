import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { financeContext, withFinanceLock, financeCompany } from '../../shared/financeAccess.js';
import { postFinanceSource } from '../../shared/financeAutomatic.js';
import { requireValue } from '../../shared/financeValidation.js';
import { runModuleJob } from '../../shared/financeModuleJob.js';
import { automaticFinanceCompanies } from '../../shared/financeAutomaticCompanies.js';
import { runInventoryJob } from '../../shared/inventoryAccountingJob.js';
import { runRevenueJob } from '../../shared/financeEventRevenue.js';
import { prepareOperational } from '../../shared/financeOperationalReview.js';
export default async function(req) {
 try {
  const base44=createClientFromRequest(req),ctx=await financeContext(base44);
  requireValue(ctx.user.role==='admin','Automatic posting jobs require an administrator.',403);
  const input=await req.json();requireValue(typeof input.source_id==='string'&&input.source_id,'A source journal ID is required.');
  if(input.operational_entity){
   let s;try{s=await ctx.svc.entities[input.operational_entity].get(input.source_id);}catch{s=null;}
   if(!s)return Response.json({skipped:true,reason:'Source was removed.'});
   let owners=await automaticFinanceCompanies(ctx,s);
   if(!owners.length)owners=(await ctx.svc.entities.FinanceCompany.filter({branch_ids:s.branch_id},{limit:5})).items;
   if(owners.length!==1)return Response.json({skipped:true,reason:owners.length?'Branch belongs to several finance companies.':'No enabled finance company owns this branch.'});
   return Response.json(await withFinanceLock(ctx,owners[0],fresh=>prepareOperational(ctx,fresh,input.operational_entity,s)));
  }
  if(input.inventory_entity)return Response.json(await runInventoryJob(ctx,input));
  if(input.revenue_entity==='CateringReconciliation')return Response.json(await runRevenueJob(ctx,input));
  if(input.source_entity)return Response.json(await runModuleJob(ctx,input));
  let source;try{source=await ctx.svc.entities.JournalEntry.get(input.source_id);}catch(error){if(error.status===404||error.response?.status===404)return Response.json({skipped:true,reason:'Source was removed before posting.'});throw error;}
  if(!source)return Response.json({skipped:true,reason:'Source was removed before posting.'});
  let companies;
     if(input.company_id)companies=[await financeCompany(ctx,input.company_id)];
     else companies=await automaticFinanceCompanies(ctx,source);
     requireValue(companies.length<=1,'Branch is assigned to multiple automatically configured companies. Resolve company ownership before posting.',409);
  if(!companies.length)return Response.json({skipped:true,reason:'No enabled finance company owns this branch.'});
  return Response.json(await withFinanceLock(ctx,companies[0],fresh=>postFinanceSource(ctx,fresh,source,{dryRun:input.dry_run===true})));
 }catch(error){console.error('Automatic posting failed:',error.message);return Response.json({error:error.message},{status:error.status||500});}
}