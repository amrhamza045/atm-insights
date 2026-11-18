import { paymentReviewContext,paymentReviewBranch,paymentReviewError,guardOwnPayment } from './cateringPaymentReviewAccess.js';
import { withCateringPaymentReviewLock } from './cateringPaymentReviewLock.js';
import { checkCateringPaymentApproval } from './cateringPaymentApprovalChecks.js';
import { confirmCateringPayment } from './cateringPaymentConfirm.js';
import { auditCateringPayment } from './cateringPaymentAudit.js';
import { audit } from './auditLog.js';
import { auditSelfApproval } from './selfApprovalBypass.js';
import { sendPaymentNotifications } from './cateringPaymentNotify.js';
import { autoEmailReceipt } from './receiptEmail.js';
export async function reviewCateringPayment(base44,input){
 if(!['approve','reject'].includes(input.decision))throw paymentReviewError('Choose approve or reject.');
 const ctx=await paymentReviewContext(base44);
 const initial=await ctx.svc.entities.CateringPayment.get(input.payment_id);
 if(initial.payment_type==='deposit_withdrawal')throw paymentReviewError('Use the existing deposit withdrawal approval process.');
 const scopedEvent=await ctx.svc.entities.CateringEvent.get(initial.event_id);paymentReviewBranch(ctx,scopedEvent);
 const result=await withCateringPaymentReviewLock(ctx.svc,initial.event_id,async event=>{
  paymentReviewBranch(ctx,event);
  const payment=await ctx.svc.entities.CateringPayment.get(initial.id);
  if(payment.event_id!==event.id||payment.status!=='pending')throw paymentReviewError('This payment is no longer pending approval.',409);
  const selfReason=await guardOwnPayment(ctx,payment,'You submitted this payment — another authorized user must decide it.');
  let result;
  if(input.decision==='reject'){
   const reason=String(input.reason||'').trim();if(!reason)throw paymentReviewError('A rejection reason is required.');
   result={payment:await ctx.svc.entities.CateringPayment.update(payment.id,{status:'rejected',approved_by:ctx.user.email,approved_date:new Date().toISOString(),rejection_reason:reason}),event,rejected:true};
  }else{
   const warning=await checkCateringPaymentApproval(ctx,event,payment,input);if(warning)return warning;
   result={...await confirmCateringPayment(ctx,event,payment),approved:true};
  }
  await auditCateringPayment(base44,ctx.user,event,payment,result.payment,input.decision==='approve'?'approve':'reject','reviewCateringPayment');
  await audit(base44,ctx.user,'update','CateringPayment',`${input.decision==='approve'?'Approved':'Rejected'} ${payment.payment_type} of ${payment.amount} EGP on ${event.event_name}`,{entityId:payment.id,entityName:event.event_name,changes:{status:{from:'pending',to:result.payment.status},approved_by:ctx.user.email,reason:result.payment.rejection_reason||''}});
  if(selfReason==='bypass'&&result.approved)await auditSelfApproval(ctx.svc,ctx.user,'CateringPayment',payment.id,`${payment.payment_type} of ${payment.amount} EGP on ${event.event_name}`);
  return result;
 });
 if(result.approved&&!result.payment.credit_note)result.notifications=await sendPaymentNotifications(base44,{event:result.event,payment:result.payment,previousDepositStatus:result.previous_deposit_status}).catch(error=>({warnings:[`Payment approved, but notifications failed: ${error.message}`]}));
 // Client receipt PDF (Catering › Settings › Client Receipt); never undoes the approval.
 if(result.approved&&!result.payment.credit_note)result.receipt=await autoEmailReceipt(base44.asServiceRole,{event:result.event,payment:result.payment});
 return result;
}