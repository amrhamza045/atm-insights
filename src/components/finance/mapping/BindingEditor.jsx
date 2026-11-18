import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import BindingConditions from '@/components/finance/mapping/BindingConditions';
import BindingOverlapReview from '@/components/finance/mapping/BindingOverlapReview';
import MappingKeyPicker from '@/components/finance/mapping/MappingKeyPicker';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function BindingEditor({company,catalogue,binding,onClose}){
 const [data,setData]=useState(()=>({mapping_key:'',account_id:'',effective_from:new Date().toISOString().slice(0,10),effective_to:'',priority:100,conditions:{},notes:'',...binding}));
 const qc=useQueryClient(),patch=v=>setData(d=>({...d,...v}));
 // Cash and bank accounts are set only in Payment methods.
 const paymentKey=['PAYMENT_METHOD_ACC','BANK_CASH_ACCOUNT'].includes(data.mapping_key);
 const save=useMutation({mutationFn:()=>financeCall({action:'mapping_binding_save',company_id:company.id,id:binding.id,expected_updated_date:binding.updated_date,data}),onSuccess:()=>{qc.invalidateQueries({queryKey:['finance']});onClose();}});
 return <form className="border rounded-lg p-4 space-y-4" onSubmit={e=>{e.preventDefault();save.mutate();}}><h4 className="font-semibold">{binding.id?'Edit account routing':'Add account routing'}</h4><div className="grid sm:grid-cols-2 gap-3">
 <MappingKeyPicker companyId={company.id} keys={catalogue.blueprint_keys} value={data.mapping_key} disabled={save.isPending} onChange={mapping_key=>patch({mapping_key})}/><div className="text-sm">Company chart account<FinanceAccountPicker companyId={company.id} value={data} onChange={patch}/></div>
 {data.mapping_key==='OPENING_BALANCE_EQUITY_ACCOUNT'?<div className="text-sm">Effective from<p className="text-xs text-muted-foreground mt-1">Follows your opening cut-off: posting the first opening balance moves this mapping to start on the cut-off date automatically.</p></div>:<label className="text-sm">Effective from<Input required type="date" value={data.effective_from} onChange={e=>patch({effective_from:e.target.value})}/></label>}<label className="text-sm">Effective to<Input type="date" min={data.effective_from} value={data.effective_to} onChange={e=>patch({effective_to:e.target.value})}/></label>
 <label className="text-sm">Priority (higher wins)<Input required type="number" min="0" max="1000" value={data.priority} onChange={e=>patch({priority:e.target.value===''?'':Number(e.target.value)})}/></label><label className="text-sm">Notes<Input maxLength={1000} value={data.notes} onChange={e=>patch({notes:e.target.value})}/></label></div>
 {data.mapping_key==='INVENTORY_CONTROL_ACCOUNT'&&<label className="block text-sm">Inventory type<select required className="block border rounded-md bg-background p-2" value={data.inventory_stage||''} onChange={e=>patch({inventory_stage:e.target.value})}><option value="">Select type</option><option value="raw">Raw materials · الخامات</option><option value="semi_finished">Semi-finished · نصف مصنع</option><option value="finished">Finished goods · المنتج النهائي</option></select></label>}
 <BindingConditions companyId={company.id} mappingKey={data.mapping_key} fields={catalogue.condition_fields} value={data.conditions} disabled={save.isPending} onChange={conditions=>patch({conditions})}/>
 <BindingOverlapReview companyId={company.id} data={data} bindingId={binding.id}/>
 <p className="text-xs text-muted-foreground">A binding referenced by pending or approved rules cannot be overwritten or deleted. Add a higher-priority, future-dated binding and include it in the joint review instead.</p>
 {paymentKey&&<p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{data.mapping_key} is not set here. Cash and bank accounts come from Mapping Accounts › Payment methods: add or edit the payment method there.</p>}
 {save.error&&<p role="alert" className="text-destructive text-sm">{financeError(save.error)}</p>}<div className="flex gap-2"><Button type="submit" disabled={save.isPending||paymentKey}>{save.isPending?'Saving…':'Save routing'}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button></div></form>;
}