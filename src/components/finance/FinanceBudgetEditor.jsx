import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FinanceBudgetGrid from '@/components/finance/FinanceBudgetGrid';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function FinanceBudgetEditor({company,data,can,onClose}) {
 const b=data.budget,scale=10**company.currency_decimals,qc=useQueryClient();
 const [values,setValues]=useState(()=>b.values.map(v=>({...v,amount:v.amount_units===null?'':String(v.amount_units/scale)}))),[notes,setNotes]=useState(b.notes||''),[dirty,setDirty]=useState(false),[confirmed,setConfirmed]=useState(false);
 const payload={company_id:company.id,branch_id:data.branch_id,year:data.year,as_of:data.as_of,id:b.id,revision:b.revision};
 const mutation=useMutation({mutationFn:action=>financeCall({...payload,action,values,notes,confirmed}),onSuccess:()=>{qc.invalidateQueries({queryKey:['finance']});onClose();}});
 const edit=b.status==='draft'&&can('finance_journal_create'),approve=b.status==='draft'&&can('finance_journal_approve');
 return <Dialog open onOpenChange={open=>!open&&onClose()}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{b.year} budget · {b.status}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{b.basis} Amounts in {company.currency}. Missing history is blank, not zero; explicitly fill every cell before approval. Approved baselines are frozen.</p>{b.missing_months?.length>0&&<p className="text-sm">Missing original history: {b.missing_months.join(', ')}</p>}
 <FinanceBudgetGrid values={values} categories={data.budget_categories} decimals={company.currency_decimals} disabled={!edit||mutation.isPending} onChange={(month,category,amount)=>{setValues(v=>v.map(x=>x.month===month&&x.category===category?{...x,amount}:x));setDirty(true);setConfirmed(false);}}/>
 <label className="text-sm">Budget assumptions<Textarea disabled={!edit||mutation.isPending} value={notes} onChange={e=>{setNotes(e.target.value);setDirty(true);setConfirmed(false);}}/></label>
 {b.approved_at&&<p className="text-sm">Approved by {b.approved_by} · {new Date(b.approved_at).toLocaleString()}</p>}
 {approve&&<label className="flex gap-2 text-sm"><input type="checkbox" disabled={dirty||mutation.isPending} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed all monthly amounts and assumptions, including missing history, and approve this budget baseline.</label>}{dirty&&approve&&<p className="text-xs text-muted-foreground">Save and reopen this draft before approving it.</p>}
 {mutation.error&&<p role="alert" className="text-sm text-destructive">{financeError(mutation.error)}</p>}
 <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Close</Button>{edit&&<Button disabled={mutation.isPending||!dirty} onClick={()=>mutation.mutate('save_budget')}>Save draft</Button>}{approve&&<Button disabled={mutation.isPending||dirty||!confirmed||b.values.some(v=>v.amount_units===null)} onClick={()=>mutation.mutate('approve_budget')}>Approve budget</Button>}</div>
 </DialogContent></Dialog>;
}