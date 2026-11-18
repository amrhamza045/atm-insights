import { useState } from 'react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function PaymentMethodEditor({company,method,onClose,onSaved}){
 const [form,setForm]=useState(()=>({code:'',name:'',account_id:'',is_default:false,...method,older:(method?.legacy_codes||[]).join(', ')})),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await financeCall({action:'payment_method_save',company_id:company.id,id:method?.id,expected_updated_date:method?.updated_date,data:{code:form.code,name:form.name,account_id:form.account_id,legacy_codes:form.older,is_default:!!form.is_default}});await onSaved();onClose();}catch(e){setError(financeError(e));}finally{setBusy(false);}};
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent><DialogHeader><DialogTitle>{method?'Edit':'Create'} payment method</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4">
  <div><Label htmlFor="method-code">Stable code</Label><Input id="method-code" required maxLength={80} disabled={!!method||busy} value={form.code} placeholder="e.g. bank_transfer" onChange={e=>setForm({...form,code:e.target.value})}/><p className="text-xs text-muted-foreground">Codes cannot be renamed. Use an existing transaction code when configuring a historical method.</p></div>
  <div><Label htmlFor="method-name">Display name</Label><Input id="method-name" required maxLength={120} disabled={busy} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
  <div><Label>GL cash / bank / clearing account</Label><FinanceAccountPicker companyId={company.id} value={form} disabled={busy} onChange={account=>setForm({...form,...account})}/><p className="text-xs text-muted-foreground">Must be an active asset posting account in {company.name}.</p></div>
  <div><Label htmlFor="method-older">Older codes (optional)</Label><Input id="method-older" maxLength={400} disabled={busy} value={form.older} placeholder="e.g. cash, card" onChange={e=>setForm({...form,older:e.target.value})}/><p className="text-xs text-muted-foreground">Codes recorded on earlier transactions for this same method, separated by commas. They post to this method's account. A code already on transactions cannot be removed.</p></div>
  <label className="flex items-start gap-3 text-sm"><Switch checked={!!form.is_default} disabled={busy||method?.is_default} onCheckedChange={is_default=>setForm({...form,is_default})}/><span>Default method<span className="block text-xs text-muted-foreground">Used only when a record does not say how it was paid. One per company; to change it, mark another method as the default.</span></span></label>
  <p className="text-sm text-muted-foreground">Account changes apply to new postings only. Posted journals and payments that captured their accounts keep them.</p>
  {error&&<p role="alert" className="text-destructive text-sm">{error}</p>}
  <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy||!form.account_id}>{busy?'Saving…':'Save payment method'}</Button></DialogFooter>
 </form></DialogContent></Dialog>;
}