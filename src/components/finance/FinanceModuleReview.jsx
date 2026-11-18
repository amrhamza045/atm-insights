import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { financeCall,financeError,financeAmount } from '@/components/finance/financeApi';
export default function FinanceModuleReview({company,entity,record,onClose}) {
 const [date,setDate]=useState(entity==='PurchaseInvoice'?record.invoice_date||'':''),[confirmed,setConfirmed]=useState(false),[note,setNote]=useState(''),[requestId]=useState(()=>crypto.randomUUID()),qc=useQueryClient();
 const payload={company_id:company.id,source_entity:entity,source_id:record.id,entry_date:date,confirmed_paid:confirmed};
 const preview=useMutation({mutationFn:()=>financeCall({...payload,action:'module_preview'})});
 const prepare=useMutation({mutationFn:()=>financeCall({...payload,action:'prepare_module',evidence_note:note,request_id:requestId,preview_token:preview.data.token}),onSuccess:()=>{qc.invalidateQueries({queryKey:['finance']});onClose();}});
 const reset=()=>preview.reset();
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Review {entity==='Order'?'paid sale':'supplier invoice'}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Reconcile this source against existing balances and unlinked manual journals. Do not import it twice. This proposal has no ledger effect until independently approved.</p><label className="text-sm">Original accounting date<Input type="date" required disabled={entity==='PurchaseInvoice'} value={date} onChange={e=>{setDate(e.target.value);reset();}}/></label>
 {entity==='Order'&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>{setConfirmed(e.target.checked);reset();}}/>I verified this sale was actually paid on the selected date; completion alone is not payment evidence.</label>}
 <Button variant="outline" disabled={preview.isPending||!date||(entity==='Order'&&!confirmed)} onClick={()=>preview.mutate()}>{preview.isPending?'Loading preview…':'Preview proposed journal'}</Button>
 {preview.data&&<><p className="text-sm">{preview.data.description} · {preview.data.entry_date}</p><table className="w-full text-sm"><thead><tr><th className="text-left">Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{preview.data.lines.map((l,i)=><tr key={i}><td>{l.account_code} · {l.account_name}</td><td className="text-right">{financeAmount(l.debit,company)}</td><td className="text-right">{financeAmount(l.credit,company)}</td></tr>)}</tbody></table><p className="text-sm">Balanced total: {financeAmount(preview.data.total_debit,company)} {company.currency}</p></>}
 <label className="text-sm">Supporting evidence and reconciliation note<Textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe the payment or invoice evidence and confirm this transaction is not already in starting balances."/></label>
 {(preview.error||prepare.error)&&<p role="alert" className="text-sm text-destructive">{financeError(prepare.error||preview.error)}</p>}
 <div className="flex gap-2 justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!preview.data||!note.trim()||prepare.isPending} onClick={()=>prepare.mutate()}>{prepare.isPending?'Submitting…':'Submit for independent review'}</Button></div>
 </DialogContent></Dialog>;
}