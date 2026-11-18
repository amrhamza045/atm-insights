import { runWithRollback,snapshot,postPaymentToLedger,loadEventMoney,round2 } from './cateringPaymentPosting.js';
import { approvalHolds,eventFirstPayment } from './paymentPolicyRules.js';
import { capturePaymentAccounts } from './cateringConfiguredPayment.js';
export async function confirmCateringPayment(ctx,event,payment){
 return runWithRollback(ctx.svc,event.id,async track=>{
  const routing=payment.payment_method_id&&payment.payment_account_snapshot?{}:await capturePaymentAccounts(ctx.svc,event,payment);
  const saved=await ctx.svc.entities.CateringPayment.update(payment.id,{...routing,status:'completed',approved_by:ctx.user.email,approved_date:new Date().toISOString()});
  track.undo(()=>ctx.svc.entities.CateringPayment.updateMany({id:payment.id},{$set:{status:'pending',...(payment.approved_by!==undefined?{approved_by:payment.approved_by}:{}),...(payment.approved_date!==undefined?{approved_date:payment.approved_date}:{})},$unset:{...(payment.approved_by===undefined?{approved_by:1}:{}),...(payment.approved_date===undefined?{approved_date:1}:{})}}));
  const journal=await postPaymentToLedger(ctx.svc,saved,event);track.journal(journal?.id);
  const money=await loadEventMoney(ctx.svc,event);
  // Booked under a payment policy: its first payment is the deposit, and a booking on approval hold (or not approved) is never confirmed.
  const policy=!!event.payment_policy_id,held=policy&&approvalHolds(event);
  const required=policy?eventFirstPayment(event,Number(event.quote_total)||0,money.grandTotal):Number(event.required_deposit_amount)||0;
  const depositStatus=money.depositPaid<=0?'none':required>0&&money.depositPaid>=required?'paid':'partial';
  const queuesReservation=!held&&!payment.credit_note&&depositStatus==='paid'&&!event.inventory_reserved&&event.status!=='cancelled'&&!['reserved','shortfall','pending_approval'].includes(event.reservation_status||'none');
  let status=payment.credit_note?(['confirmed','in_progress'].includes(event.status)&&depositStatus!=='paid'?'deposit_pending':event.status):['cancelled','completed'].includes(event.status)?event.status:depositStatus==='paid'?(event.status==='in_progress'?'in_progress':'confirmed'):['confirmed','in_progress','deposit_pending_verification'].includes(event.status)?'deposit_pending':event.status;
  if(held&&status==='confirmed'&&event.status!=='confirmed')status='deposit_pending';
  track.event(snapshot(event));
  const updated=await ctx.svc.entities.CateringEvent.update(event.id,{...(policy?{required_deposit_amount:required}:{}),total_paid:money.totalPaid,deposit_paid_amount:money.depositPaid,balance_due:round2(money.grandTotal-money.totalPaid),deposit_status:depositStatus,status,...(queuesReservation?{reservation_status:'pending_approval',reservation_requested_by:ctx.user.email,reservation_requested_date:new Date().toISOString(),reservation_rejection_reason:''}:{})});
  return {payment:saved,event:updated,queuesReservation,previous_deposit_status:event.deposit_status,deposit_status:depositStatus};
 });
}