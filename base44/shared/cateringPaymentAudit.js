import { auditChangedFields } from './financeAuditSnapshot.js';
import { fmtEGP } from './cateringPaymentPosting.js';
const fields=['id','payment_type','amount','payment_method','status','payment_date','reference','recorded_by','recorded_by_id','credit_note','approved_by','approved_date','rejection_reason','voided_by','voided_date','void_reason','notes','quote_id'];
function paymentSnapshot(payment,event){
 return {...Object.fromEntries(fields.filter(key=>payment[key]!==undefined).map(key=>[key,payment[key]])),currency:'EGP',event_id:event.id,event_name:event.event_name,branch_id:event.branch_id,branch_name:event.branch_name||''};
}
// Call only after the complete operation succeeds, never from inside rollback work.
// Finance membership and branch restrictions are enforced by the existing audit reader.
export async function auditCateringPayment(base44,user,event,previous,saved,action,operation){
 try{
  if(!event.branch_id){console.warn('Catering Finance audit skipped: event has no branch.',event.id);return;}
  const svc=base44.asServiceRole;
  const page=await svc.entities.FinanceCompany.filter({branch_ids:event.branch_id,is_active:{$ne:false}},{limit:2});
  if(page.items.length!==1||page.has_more){console.warn('Catering Finance audit skipped: branch needs one active Finance company.',event.branch_id);return;}
  const before=paymentSnapshot(previous,event),after=paymentSnapshot(saved,event),changed_fields=auditChangedFields(before,after);
  if(!changed_fields.length)return;
  await svc.entities.FinanceAuditEvent.create({company_id:page.items[0].id,branch_id:event.branch_id,actor_id:user.id,actor_email:user.email,actor_name:user.full_name||'',actor_type:'user',request_id:crypto.randomUUID(),operation,action,entity_type:'CateringPayment',entity_id:saved.id,entity_label:`${saved.payment_type.replaceAll('_',' ')} · ${fmtEGP(saved.amount)} · ${event.event_name}`,before,after,changed_fields,reason:action==='reject'?saved.rejection_reason||'':action==='reversal'?saved.void_reason||'':saved.notes||'',source_entity:'CateringEvent',source_id:event.id});
 }catch(error){console.error('Catering Finance audit storage failed:',error.message);}
}