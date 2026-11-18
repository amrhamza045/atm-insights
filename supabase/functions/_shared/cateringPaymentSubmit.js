import { audit } from './auditLog.js';
import { capturePaymentAccounts } from './cateringConfiguredPayment.js';
export async function submitCateringPayment(base44,user,event,data){
 const routing=await capturePaymentAccounts(base44.asServiceRole,event,data);
 const payment=await base44.asServiceRole.entities.CateringPayment.create({branch_id:event.branch_id,branch_name:event.branch_name||'',event_id:event.id,event_name:event.event_name,quote_id:event.active_quote_id||'',client_id:event.client_id,client_name:event.client_name||'',source:'catering',...data,...routing,status:'pending',payment_date:new Date().toISOString(),recorded_by:user.email,recorded_by_id:user.id});
 await audit(base44,user,'create','CateringPayment',`Submitted ${payment.payment_type} of ${payment.amount} EGP for approval on ${event.event_name}`,{entityId:payment.id,entityName:event.event_name,changes:{status:{from:null,to:'pending'}}});
 return payment;
}