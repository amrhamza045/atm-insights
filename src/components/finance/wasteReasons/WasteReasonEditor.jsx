import { useState } from 'react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import { financeCall,financeError } from '@/components/finance/financeApi';
import { WASTE_GROUPS } from './wasteGroups';
export default function WasteReasonEditor({company,reason,onClose,onSaved}){
 const [form,setForm]=useState(reason||{code:'',name:'',reason_group:'other',account_id:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await financeCall({action:'waste_reason_save',company_id:company.id,id:reason?.id,expected_updated_date:reason?.updated_date,data:form});await onSaved();onClose();}catch(e){setError(financeError(e));}finally{setBusy(false);}};
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent><DialogHeader><DialogTitle>{reason?'Edit':'Add'} waste reason</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4">
  <div><Label htmlFor="reason-name">Name shown in the waste popup</Label><Input id="reason-name" required maxLength={120} disabled={busy} value={form.name} placeholder="e.g. Expired" onChange={e=>setForm({...form,name:e.target.value})}/></div>
  <div><Label htmlFor="reason-code">Stable code</Label><Input id="reason-code" required maxLength={80} disabled={!!reason||busy} value={form.code} placeholder="e.g. expired" onChange={e=>setForm({...form,code:e.target.value})}/><p className="text-xs text-muted-foreground">Lowercase letters, numbers and underscores. Codes cannot be renamed.</p></div>
  <div><Label>Reporting group</Label><Select value={form.reason_group} disabled={busy} onValueChange={reason_group=>setForm({...form,reason_group})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(WASTE_GROUPS).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Keeps existing waste reports grouping correctly.</p></div>
  <div><Label>Treatment</Label><Select value={form.treatment||'waste'} disabled={busy} onValueChange={treatment=>setForm({...form,treatment})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="waste">Waste</SelectItem><SelectItem value="food_tasting">Food tasting</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Food tasting linked to an event waits in the tastings holding account, then moves to COGS when the event is closed or to this reason's account if it is cancelled. Tastings are left out of waste reports.</p></div>
  <div><Label>GL account</Label><FinanceAccountPicker companyId={company.id} value={form} disabled={busy} onChange={account=>setForm({...form,...account})}/><p className="text-xs text-muted-foreground">Active cost-of-sales or expense posting account in {company.name}.</p></div>
  {error&&<p role="alert" className="text-destructive text-sm">{error}</p>}
  <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy||!form.account_id}>{busy?'Saving…':'Save waste reason'}</Button></DialogFooter></form></DialogContent></Dialog>;
}