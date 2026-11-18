import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { financeCall,financeError } from '@/components/finance/financeApi';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
export default function FinanceParentControl({company}){
 const choices=useFinanceList({action:'comparison_companies',company_id:company.id}),qc=useQueryClient();
 const [parent,setParent]=useState(company.parent_company_id||'');
 const save=useMutation({mutationFn:()=>financeCall({action:'set_parent',company_id:company.id,parent_company_id:parent}),onSuccess:()=>qc.invalidateQueries({queryKey:['finance']})});
 return <form onSubmit={e=>{e.preventDefault();save.mutate();}} className="border rounded-lg p-4 space-y-3"><h3 className="font-semibold">Parent–subsidiary relationship</h3><p className="text-sm text-muted-foreground">Sister companies share a parent. Relationships do not merge ledgers, grant company access, or create statutory consolidated accounts.</p><Label className="block">Parent company<select aria-label="Parent company" className="block w-full border rounded-md bg-background p-2" value={parent} onChange={e=>{setParent(e.target.value);save.reset();}}><option value="">No parent / top-level company</option>{parent&&!choices.items.some(c=>c.id===parent)&&<option value={parent}>Current parent (load more to see name)</option>}{choices.items.map(c=><option key={c.id} value={c.id} disabled={c.id===company.id||!c.full_scope}>{c.name} · {c.currency}</option>)}</select></Label><FinanceListState query={choices}/><p className="text-xs text-muted-foreground">Same currency and test/production environment required. Company-management permission and unrestricted branch access are enforced.</p><Button disabled={save.isPending||choices.isPending}>{save.isPending?'Saving…':'Save relationship'}</Button>{save.error&&<p role="alert" className="text-destructive text-sm">{financeError(save.error)}</p>}{save.isSuccess&&<p role="status" className="text-sm">Relationship saved.</p>}</form>;
}