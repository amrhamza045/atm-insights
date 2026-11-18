import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { loadRecoveryAdvance } from './financeRecoverySource.js';
import { financeMappingRead } from './financeMappingService.js';
const statuses=['captured','checking','ready','blocked','stale'];
export async function financeRecoveryRead(ctx,company,input){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Event recovery requires unrestricted company access.',403);
 if(input.action==='mapping_recovery_sources'){
  const page=await ctx.svc.entities.CateringPayment.filter({branch_id:{$in:company.branch_ids},status:'completed',payment_type:'deposit'},{sort:'-payment_date',limit:15,...(input.cursor?{cursor:input.cursor}:{})});
  return {...page,items:page.items.map(({id,event_name,amount,payment_date,payment_method})=>({id,event_name,amount,payment_date,payment_method}))};
 }
 const query={company_id:company.id};if(input.status){requireValue(statuses.includes(input.status),'Invalid recovery status.');query.status=input.status;}
 return await ctx.svc.entities.FinanceEventRecovery.filter(query,{sort:'-created_date',limit:20,...(input.cursor?{cursor:input.cursor}:{})});
}
export async function financeRecoveryWrite(ctx,company,input){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Event recovery requires unrestricted company access.',403);
 financePermission(ctx,'finance_accounts_manage');const entity=ctx.svc.entities.FinanceEventRecovery;
 if(input.action==='mapping_recovery_capture'){
  requireValue(input.source_currency===company.currency&&input.currency_confirmed===true,'Confirm that the source payment is denominated in this company currency.');
  const source=await loadRecoveryAdvance(ctx,company,input.source_id),key=`${company.id}:P01:${source.source_id}:${source.source_fingerprint}`;
  const prior=await entity.filter({company_id:company.id,capture_key:key},{limit:1});if(prior.items.length)return {event:prior.items[0],replayed:true};
  return {event:await entity.create({...source,company_id:company.id,event_type:'P01',source_entity:'CateringPayment',capture_key:key,currency_evidence:`${company.currency} confirmed by ${ctx.user.email}`,status:'captured',attempt_count:0,captured_by:ctx.user.email,captured_at:new Date().toISOString(),message:'Captured for rehearsal. Retry to validate the current approved mapping; no posting will occur.',posting_enabled:false})};
 }
 requireValue(input.action==='mapping_recovery_retry','Unsupported recovery action.');requireValue(typeof input.id==='string'&&input.id.length<=120,'Select a captured event.');
 const record=await entity.get(input.id).catch(e=>e.status===404?null:Promise.reject(e));requireValue(record&&record.company_id===company.id,'Recovery event not found in this company.',404);
 requireValue(company.branch_ids.includes(record.branch_id),'This branch no longer belongs to the company.',403);
 requireValue(record.event_type==='P01'&&record.source_entity==='CateringPayment','No rehearsal adapter exists for this event.');
 const attempt={status:'checking',attempt_count:(record.attempt_count||0)+1,last_attempt_at:new Date().toISOString(),last_attempt_by:ctx.user.email,preview:{},mapping_id:'',mapping_version:0,posting_enabled:false};
 await entity.update(record.id,attempt);
 let result;
 try{
  const source=await loadRecoveryAdvance(ctx,company,record.source_id);
  if(source.source_fingerprint!==record.source_fingerprint)result={status:'stale',message:'The payment or its accounting context changed. Capture the current source as a new revision; this captured revision is retained.',preview:{}};
  else {
   requireValue(!company.closed_through||record.sample.date>company.closed_through,'The source date is in a closed period. Rehearsal is blocked; the date is never silently moved.');
   const preview=await financeMappingRead(ctx,company,{action:'mapping_resolve',event_type:'P01',sample:record.sample});
   result={status:'ready',mapping_id:preview.mapping_id,mapping_version:preview.version,preview,message:'Current source and approved mapping validated. Rehearsal only; no journal has been published.'};
  }
 }catch(error){if(!error.status||error.status>=500)throw error;result={status:[403,404].includes(error.status)?'stale':'blocked',message:error.message,preview:{}};}
 return {event:await entity.update(record.id,{...result,posting_enabled:false})};
}