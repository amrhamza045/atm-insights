import { paymentReviewContext,paymentReviewBranch,paymentReviewError,guardOwnPayment } from './cateringPaymentReviewAccess.js';
import { withCateringPaymentReviewLock } from './cateringPaymentReviewLock.js';
import { checkCateringPaymentApproval } from './cateringPaymentApprovalChecks.js';
import { round2, fmtEGP, loadEventMoney } from './cateringPaymentPosting.js';
import { policyDepositMinimum, policyDepositError } from './paymentPolicyDeposit.js';
import { auditCateringPayment } from './cateringPaymentAudit.js';
import { audit } from './auditLog.js';
import { capturePaymentAccounts } from './cateringConfiguredPayment.js';
export async function editPendingCateringPayment(base44,input){
 const ctx=await paymentReviewContext(base44);
 if(typeof input.payment_id!=='string'||!input.payment_id.trim())throw paymentReviewError('payment_id is required.');
 const amount=round2(input.amount);
 if(!Number.isFinite(Number(input.amount))||!Number.isFinite(amount)||amount<=0)throw paymentReviewError('Enter an amount greater than zero.');
 if(typeof input.payment_method!=='string'||!input.payment_method.trim())throw paymentReviewError('Choose a payment method.');
 if(typeof input.reference!=='string')throw paymentReviewError('Enter a valid transaction reference.');
 if(typeof input.expected_updated_date!=='string'||!input.expected_updated_date)throw paymentReviewError('Refresh the payment before editing it.',409);
 const initial=await ctx.svc.entities.CateringPayment.get(input.payment_id);
 if(initial.payment_type==='deposit_withdrawal')throw paymentReviewError('Deposit withdrawals use their existing separate approval process.');
 const scopedEvent=await ctx.svc.entities.CateringEvent.get(initial.event_id);paymentReviewBranch(ctx,scopedEvent);
 return await withCateringPaymentReviewLock(ctx.svc,initial.event_id,async event=>{
  paymentReviewBranch(ctx,event);
  const payment=await ctx.svc.entities.CateringPayment.get(initial.id);
  if(payment.event_id!==event.id||payment.status!=='pending')throw paymentReviewError('This payment is no longer pending approval.',409);
  await guardOwnPayment(ctx,payment,'You submitted this payment — another authorized user must review it.');
  if(payment.updated_date!==input.expected_updated_date)throw paymentReviewError('This payment changed while you were editing. Close this dialog, refresh the payment and try again.',409);
  // Lowering a deposit: not below the minimum set when it was submitted, nor below what the payment policy still needs.
  if(payment.payment_type==='deposit'&&amount<round2(payment.amount)){
   const minDeposit=Number(payment.minimum_amount)||0;
   if(amount<minDeposit)throw paymentReviewError(`This deposit can't be lowered below ${fmtEGP(minDeposit)}, the minimum set when it was submitted.`);
   const policyMin=policyDepositMinimum(event,await loadEventMoney(ctx.svc,event));
   if(round2(policyMin-amount)>0.01)throw paymentReviewError(policyDepositError(event,policyMin));
  }
  const changes={amount,payment_method:input.payment_method,reference:input.reference.trim()};
  if(payment.payment_method!==input.payment_method||!payment.payment_method_id)Object.assign(changes,await capturePaymentAccounts(ctx.svc,event,{...payment,...changes}));
  const warning=await checkCateringPaymentApproval(ctx,event,{...payment,...changes},input);if(warning)return warning;
  if(Object.keys(changes).every(key=>payment[key]===changes[key]))return {payment,pending:true};
  const saved=await ctx.svc.entities.CateringPayment.update(payment.id,changes);
  await auditCateringPayment(base44,ctx.user,event,payment,saved,'update','editPendingCateringPayment');
  await audit(base44,ctx.user,'update','CateringPayment',`Edited pending ${payment.payment_type} on ${event.event_name}; approval is still required`,{entityId:payment.id,entityName:event.event_name,changes:Object.fromEntries(Object.keys(changes).filter(key=>payment[key]!==saved[key]).map(key=>[key,{from:payment[key]??null,to:saved[key]}]))});
  return {payment:saved,pending:true};
 });
}