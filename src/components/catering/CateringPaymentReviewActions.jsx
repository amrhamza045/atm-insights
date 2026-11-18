import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions,useIsAdmin } from '@/components/permissions/PermissionsContext';
import DepositFloorWarning from '@/components/catering/DepositFloorWarning';
import { canReviewCateringPayment, canSelfApprove } from '@/components/catering/paymentApprovalAccess';
import useSelfApprovalOpen from '@/components/approvals/useSelfApproval';
import PendingPaymentEditDialog from '@/components/catering/PendingPaymentEditDialog';
import { toast } from 'sonner';
import { autoApproveReservation } from '@/components/catering/autoApproveReservation';
import { useBranch } from '@/components/branches/BranchContext';
import { autoStartOperations, OPERATIONS_QUERY_KEYS } from '@/components/catering/confirm/autoStartOperations';
export default function CateringPaymentReviewActions({payment}){
 const {selectedBranch}=useBranch();
 const {permissions,currentUser}=usePermissions(),isAdmin=useIsAdmin(),cache=useQueryClient(),autoApprove=useSelfApprovalOpen();
 const [busy,setBusy]=useState(false),[rejecting,setRejecting]=useState(false),[editing,setEditing]=useState(false),[reason,setReason]=useState(''),[error,setError]=useState(''),[warning,setWarning]=useState(null),[confirmed,setConfirmed]=useState(false);
 const withdrawal=payment.payment_type==='deposit_withdrawal';
 const allowed=withdrawal?(isAdmin||(!permissions?.access_denied&&permissions?.deposit_withdrawal_approve===true&&(!permissions?.branch_id||permissions.branch_id===payment.branch_id))):canReviewCateringPayment(permissions,isAdmin,payment.branch_id);
 if(payment.status!=='pending'||!allowed)return null;
 const own=payment.recorded_by_id===currentUser?.id||String(payment.recorded_by||'').toLowerCase()===String(currentUser?.email||'').toLowerCase();
 const waiting=own&&!canSelfApprove(permissions,isAdmin,autoApprove,withdrawal?'deposit_withdrawal_approve':'catering_payment_approve');
 const decide=async decision=>{
  setBusy(true);setError('');
  try{
   const {data}=await base44.functions.invoke(withdrawal?'approveDepositWithdrawal':'recordCateringPayment',{action:'review',payment_id:payment.id,decision,reason,confirm_underfunding:!!warning&&confirmed});
   if(data.error)throw new Error(data.error);
   if(data.warning){setWarning(data);setConfirmed(false);return;}
   await Promise.all(['catering-payment-approvals','catering-payments','catering-events','catering-reservations','catering-production','catering-profitability','approvals-deposit-withdrawals','finance'].map(key=>cache.invalidateQueries({queryKey:[key]})));
   toast.success(decision==='approve'?'Payment approved and confirmed':'Payment rejected');
   if(decision==='approve'&&!withdrawal&&data.event?.status==='confirmed'&&data.event?.deposit_status==='paid'){
    autoApproveReservation(payment.event_id,selectedBranch).then(r=>{if(r)toast.success('Reservation auto-approved');return autoStartOperations(payment.event_id);}).then(res=>{if(res){toast.success('Operations started automatically — the event is now in active planning.');OPERATIONS_QUERY_KEYS.forEach(key=>cache.invalidateQueries({queryKey:[key]}));}})
     .catch(e=>toast.error(`Deposit approved, but operations could not start: ${e.message}. Retry from the Confirm & Start tab.`));
   }
   (data.notifications?.warnings||[]).forEach(text=>toast.warning(text));
   if(data.notifications?.failed||data.notifications?.customer_sent===false)toast.warning('Payment approved, but some notifications could not be sent.');
   setRejecting(false);setReason('');setWarning(null);setConfirmed(false);
  }catch(e){setError(e?.response?.data?.error||e.message||'Could not review payment.');}
  finally{setBusy(false);}
 };
 return <div className="space-y-2 pt-2">{waiting?<p className="text-xs text-muted-foreground">Waiting for another authorized user; you cannot decide your own payment.</p>:<><div className="flex flex-wrap gap-2">{!withdrawal&&<Button size="sm" variant="outline" disabled={busy||editing} onClick={()=>{setEditing(true);setRejecting(false);setError('');}}>Edit payment</Button>}<Button size="sm" disabled={busy||editing||(!!warning&&!confirmed)} onClick={()=>decide('approve')}>{busy?'Processing…':'Approve payment'}</Button><Button size="sm" variant="destructive" disabled={busy} onClick={()=>{setRejecting(true);setError('');}}>Reject</Button></div>{warning&&<DepositFloorWarning warning={warning} confirmed={confirmed} onConfirmedChange={setConfirmed} actionLabel="approve this refund"/>}{rejecting&&<div className="flex flex-wrap gap-2"><Input className="flex-1 min-w-40" aria-label="Rejection reason" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Rejection reason (required)"/><Button size="sm" variant="destructive" disabled={busy||!reason.trim()} onClick={()=>decide('reject')}>Confirm rejection</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>setRejecting(false)}>Cancel</Button></div>}{editing&&!withdrawal&&<PendingPaymentEditDialog payment={payment} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);setWarning(null);setConfirmed(false);setError('');}}/>}</>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}