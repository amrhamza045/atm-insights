import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { financeCall,financeError,financeAmount } from '@/components/finance/financeApi';
import FinanceLineEditor from '@/components/finance/FinanceLineEditor';
export default function FinanceProposalForm({company,branches,source,kind='manual',onClose}) {
 const initial=kind==='historical'?(source.entries||[]).map(l=>({debit:l.debit||0,credit:l.credit||0,cost_center:'',legacy_code:l.account_number})):kind==='reversal'?source.lines.map(l=>({...l,debit:l.credit,credit:l.debit})):[{debit:0,credit:0,cost_center:''},{debit:0,credit:0,cost_center:''}];
 const [lines,setLines]=useState(initial),[requestKey]=useState(()=>crypto.randomUUID()),qc=useQueryClient();
 const save=useMutation({mutationFn:data=>financeCall({action:'prepare',company_id:company.id,data}),onSuccess:()=>{qc.invalidateQueries({queryKey:['finance']});onClose();}});
 const totals=lines.reduce((v,l)=>[v[0]+Math.round((Number(l.debit)||0)*10**company.currency_decimals),v[1]+Math.round((Number(l.credit)||0)*10**company.currency_decimals)],[0,0]);
 const submit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));save.mutate({...data,kind,request_key:requestKey,source_id:source?.id,lines});};
 return <Dialog open onOpenChange={v=>!v&&onClose()}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{kind==='historical'?'Reconstruct legacy journal':kind==='reversal'?'Prepare reversal':kind==='opening'?'Opening balance proposal':'Prepare journal'}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4">
 <p className="text-sm text-muted-foreground">Saving creates a proposal, not a posted journal. A different authorized reviewer must approve it.{kind==='historical'?' Original dates and amounts are preserved; verify accounting treatment and tax evidence before approval. Incorrect legacy amounts require a separate correcting journal.':''}{kind==='opening'?' Do not duplicate balances also being reconstructed from historical transactions.':''}</p>
 <div className="grid sm:grid-cols-2 gap-3"><Label>Branch<select name="branch_id" className="w-full border rounded p-2 bg-background" required defaultValue={source?.branch_id||''} disabled={!!source}><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Label><Label>Accounting date<Input name="entry_date" type="date" required readOnly={kind==='historical'} defaultValue={kind==='historical'?source.entry_date.slice(0,10):''}/></Label></div>
 <Label className="block">Description<Input name="description" defaultValue={source?`${kind==='reversal'?'Reversal: ':''}${source.description}`:''} required/></Label><FinanceLineEditor company={company} lines={lines} onChange={setLines} readAmounts={kind==='historical'} locked={kind==='reversal'}/>
 <p className={`text-sm font-medium ${totals[0]!==totals[1]?'text-destructive':''}`}>Debit {financeAmount(totals[0]/10**company.currency_decimals,company)} / Credit {financeAmount(totals[1]/10**company.currency_decimals,company)} {company.currency}</p>
 <Label className="block">Supporting evidence and treatment review<Textarea name="evidence_note" required placeholder="Document references, accounting rationale, and any tax or valuation review performed."/></Label>
 {save.error&&<p role="alert" className="text-destructive text-sm">{financeError(save.error)}</p>}<Button disabled={save.isPending||totals[0]!==totals[1]||!totals[0]}>{save.isPending?'Saving…':'Submit for independent review'}</Button></form></DialogContent></Dialog>;
}