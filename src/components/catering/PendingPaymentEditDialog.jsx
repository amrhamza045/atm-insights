import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DepositFloorWarning from '@/components/catering/DepositFloorWarning';
import { toast } from 'sonner';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import ConfiguredPaymentMethodSelect from '@/components/catering/ConfiguredPaymentMethodSelect';
export default function PendingPaymentEditDialog({payment,onClose,onSaved}){
 const cache=useQueryClient();
 const [form,setForm]=useState({amount:String(payment.amount),payment_method:payment.payment_method||'',reference:payment.reference||''});
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[warning,setWarning]=useState(null),[confirmed,setConfirmed]=useState(false);
 const [version]=useState(payment.updated_date);
 // Deposits keep the minimum set when they were submitted (the higher of their % box and the payment policy).
 const minDeposit=payment.payment_type==='deposit'?Number(payment.minimum_amount)||0:0;
 const belowMin=minDeposit>0&&Number(form.amount)<minDeposit;
 const set=(key,value)=>{setForm(previous=>({...previous,[key]:value}));setError('');setWarning(null);setConfirmed(false);};
 const save=async()=>{
  setSaving(true);setError('');
  try{
   const {data}=await base44.functions.invoke('recordCateringPayment',{action:'edit',payment_id:payment.id,...form,amount:Number(form.amount),expected_updated_date:version,confirm_underfunding:!!warning&&confirmed});
   if(data.error)throw new Error(data.error);
   if(data.warning){setWarning(data);setConfirmed(false);return;}
   await Promise.all(['catering-payment-approvals','catering-payments','finance'].map(key=>cache.invalidateQueries({queryKey:[key]})));
   toast.success('Payment edits saved; approval is still required');onSaved();
  }catch(e){setError(e?.response?.data?.error||e.message||'Could not edit payment.');}
  finally{setSaving(false);}
 };
 return <Dialog open onOpenChange={open=>{if(!open&&!saving)onClose();}}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit pending payment</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{payment.event_name}. Only the amount, payment method and transaction reference can change. Saving does not approve the payment or change balances.</p><div className="space-y-3"><Label className="block">Amount<Input type="number" min={minDeposit||0.01} step="0.01" disabled={saving} value={form.amount} onChange={e=>set('amount',e.target.value)}/>{minDeposit>0&&<span className={`block mt-1 text-xs font-normal ${belowMin?'text-destructive':'text-muted-foreground'}`}>Minimum {formatCurrency(minDeposit,true)}, set when it was submitted</span>}</Label><Label className="block">Payment method<ConfiguredPaymentMethodSelect eventId={payment.event_id} disabled={saving} value={form.payment_method} onChange={value=>set('payment_method',value)}/></Label><Label className="block">Transaction reference<Input disabled={saving} value={form.reference} onChange={e=>set('reference',e.target.value)}/></Label>{warning&&<DepositFloorWarning warning={warning} confirmed={confirmed} onConfirmedChange={setConfirmed} actionLabel="save this pending refund for approval"/>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div><DialogFooter><Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving||!Number.isFinite(Number(form.amount))||Number(form.amount)<=0||belowMin||(!!warning&&!confirmed)} onClick={save}>{saving?'Saving…':'Save changes'}</Button></DialogFooter></DialogContent></Dialog>;
}