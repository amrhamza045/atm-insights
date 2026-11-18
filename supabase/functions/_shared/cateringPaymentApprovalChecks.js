import { loadEventMoney,round2,fmtEGP } from './cateringPaymentPosting.js';
import { pricedByUser } from './depositWithdrawal.js';
import { paymentReviewError } from './cateringPaymentReviewAccess.js';
import { isSettlement } from './cateringCancellationPlan.js';
// A settlement step only needs the event still open and, when it takes from what was paid, enough paid.
function checkSettlement(ctx,event,payment,amount,money){
 if(event.status==='cancelled')throw paymentReviewError('This event is already cancelled.',409);
 if(['penalty','refund'].includes(payment.payment_type)&&amount>money.totalPaid)throw paymentReviewError(`This settlement step exceeds the ${fmtEGP(money.totalPaid)} paid on the event.`);
 return null;
}
export async function checkCateringPaymentApproval(ctx,event,payment,input){
 const amount=Number(payment.amount);
 if(!Number.isFinite(amount)||amount<=0)throw paymentReviewError('The saved payment amount must be greater than zero.');
 if(!['deposit','final_balance','additional','refund','penalty'].includes(payment.payment_type))throw paymentReviewError('Unsupported payment type.');
 const money=await loadEventMoney(ctx.svc,event);
 // Cancellation settlement steps are sized by the cancellation plan, not the event balance.
 if(isSettlement(payment))return checkSettlement(ctx,event,payment,amount,money);
 if(['deposit','final_balance','additional'].includes(payment.payment_type)&&amount>money.remaining)throw paymentReviewError(`Payment exceeds the current remaining balance of ${fmtEGP(money.remaining)}.`);
 if(payment.payment_type==='refund'){
  const available=payment.credit_note?money.depositPaid:money.totalPaid;
  if(amount>available)throw paymentReviewError(`Refund exceeds the current ${payment.credit_note?'refundable deposit':'paid amount'} of ${fmtEGP(available)}.`);
  if(payment.credit_note&&!ctx.central&&await pricedByUser(ctx.svc,event,ctx.user.email))throw paymentReviewError('You priced this event — another authorized user must approve its credit note.',403);
 }
 // A penalty is kept from what the client has paid, so it can't be more than that.
 if(payment.payment_type==='penalty'&&amount>money.totalPaid)throw paymentReviewError(`A penalty is kept from what the client has paid, so it can't exceed ${fmtEGP(money.totalPaid)}.`);
 if(['refund','penalty'].includes(payment.payment_type)){
  const floor=Number(event.required_deposit_amount)||0,projected=Math.max(0,round2(money.depositPaid-amount));
  if(event.status!=='cancelled'&&floor>0&&projected<floor&&input.confirm_underfunding!==true)return {warning:'below_deposit_floor',required_deposit:floor,deposit_paid:money.depositPaid,projected_deposit:projected,shortfall:round2(floor-projected)};
 }
 return null;
}