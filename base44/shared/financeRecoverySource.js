import { requireValue, validDate } from './financeValidation.js';
import { financeBranch } from './financeAccess.js';
import { decimalUnits } from './financeMappingValidation.js';
const optionalGet=(entity,id)=>entity.get(id).catch(e=>e.status===404?null:Promise.reject(e));
export async function loadRecoveryAdvance(ctx,company,id,{includeAdditional=false,includeFinalBalance=false,includeRetainedPenalty=false,includeOutgoing=false}={}){
 requireValue(typeof id==='string'&&id.length>0&&id.length<=120,'Select a catering advance.');
 const p=await optionalGet(ctx.svc.entities.CateringPayment,id);requireValue(p,'The source payment no longer exists.',404);
 financeBranch(ctx,company,p.branch_id);
 const types=['deposit',...(includeAdditional?['additional']:[]),...(includeFinalBalance?['final_balance']:[]),...(includeRetainedPenalty?['penalty']:[]),...(includeOutgoing?['refund','deposit_withdrawal']:[])];
 requireValue(p.status==='completed'&&types.includes(p.payment_type)&&(!p.credit_note||includeOutgoing&&p.payment_type==='refund'),'Only completed payments of a supported type can use this customer-advance mapping.');
 const event=await optionalGet(ctx.svc.entities.CateringEvent,p.event_id);requireValue(event&&event.branch_id===p.branch_id&&event.client_id===p.client_id,'The payment does not match its catering event and customer.');
 requireValue(typeof p.updated_date==='string'&&p.updated_date,'The source needs a revision timestamp.');
 const date=String(p.payment_date||'').slice(0,10);requireValue(validDate(date),'The source payment has no valid accounting date.');
 requireValue(decimalUnits(p.amount,company.currency_decimals)>0,'The source payment must have a positive amount.');
 const sample={date,amounts:{gross:String(p.amount)},dimensions:{branch_id:p.branch_id,event_id:p.event_id,customer_id:p.client_id,payment_type:p.payment_type,currency:company.currency,channel:'catering',...(p.payment_method?{payment_method:p.payment_method}:{})}};
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({source_version:p.updated_date,sample})));
 return {source_id:p.id,source_version:p.updated_date,source_fingerprint:Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join(''),sample,branch_id:p.branch_id,source_description:p.event_name||event.event_name||'Catering advance'};
}