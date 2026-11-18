import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function MappingDeleteDraft({company,rule,can,onDeleted}){
 const [confirm,setConfirm]=useState(false),qc=useQueryClient();
 const remove=useMutation({mutationFn:()=>financeCall({action:'mapping_delete',company_id:company.id,id:rule.id,expected_updated_date:rule.updated_date}),onSuccess:()=>{qc.invalidateQueries({queryKey:['finance']});onDeleted();}});
 if(rule.status!=='draft'||!can('finance_accounts_manage'))return null;
 return <div className="space-y-2">{confirm?<div className="flex flex-wrap items-center gap-2"><p className="text-sm">Delete this unused draft? The audit record will remain.</p><Button variant="destructive" disabled={remove.isPending} onClick={()=>remove.mutate()}>Confirm delete</Button><Button variant="outline" disabled={remove.isPending} onClick={()=>setConfirm(false)}>Cancel</Button></div>:<Button variant="outline" onClick={()=>setConfirm(true)}>Delete draft</Button>}{remove.error&&<p role="alert" className="text-destructive text-sm">{financeError(remove.error)}</p>}</div>;
}