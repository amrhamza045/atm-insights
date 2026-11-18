import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import BindingConditions from '@/components/finance/mapping/BindingConditions';
import { financeCall, financeError } from '@/components/finance/financeApi';

export default function PurchaseAuditRouting({ company, detail, can }) {
 const [data,setData]=useState({mapping_key:detail.routing.keys[0],account_id:'',effective_from:detail.mapping.checked_date,effective_to:'',priority:100,conditions:{branch_id:detail.branch_id},notes:''});
 const [confirmed,setConfirmed]=useState(false),qc=useQueryClient();
 const patch=next=>{setData(d=>({...d,...next}));setConfirmed(false);save.reset();};
 const save=useMutation({mutationFn:()=>financeCall({action:'transaction_routing_save',company_id:company.id,source_entity:detail.source_entity,source_id:detail.source_id,data,confirmed}),onSuccess:()=>{setConfirmed(false);qc.invalidateQueries({queryKey:['finance']});}});
 const manage=can('finance_accounts_manage')&&can('finance_journal_approve');
 return <form className="border rounded-lg p-4 space-y-3" onSubmit={e=>{e.preventDefault();save.mutate();}}>
  <h4 className="font-semibold">Permanent supplier invoice routing</h4>
  <p className="text-sm text-muted-foreground">Define both inventory and supplier-payable keys. Complete mappings activate the existing invoice connection for matching future invoices; saving does not repost this invoice or change existing journals.</p>
  <fieldset disabled={!manage||save.isPending} className="space-y-3">
   <label className="block text-sm">Routing key<select className="block w-full border rounded-md bg-background p-2" value={data.mapping_key} onChange={e=>patch({mapping_key:e.target.value,account_id:''})}>{detail.routing.keys.map(k=><option key={k}>{k}</option>)}</select></label>
   <FinanceAccountPicker companyId={company.id} value={data} onChange={patch}/>
   {data.mapping_key==='INVENTORY_CONTROL_ACCOUNT'&&<label className="block text-sm">Inventory type<select required className="block border rounded-md bg-background p-2" value={data.inventory_stage||''} onChange={e=>patch({inventory_stage:e.target.value})}><option value="">Select type</option><option value="raw">Raw materials</option><option value="semi_finished">Semi-finished goods</option><option value="finished">Finished goods</option></select></label>}
   <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">Effective from<Input required type="date" value={data.effective_from} onChange={e=>patch({effective_from:e.target.value})}/></label><label className="text-sm">Effective to<Input type="date" min={data.effective_from} value={data.effective_to} onChange={e=>patch({effective_to:e.target.value})}/></label><label className="text-sm">Priority<Input required type="number" min="0" max="1000" value={data.priority} onChange={e=>patch({priority:Number(e.target.value)})}/></label></div>
   <BindingConditions companyId={company.id} mappingKey={data.mapping_key} fields={detail.routing.condition_fields} value={data.conditions} onChange={conditions=>patch({conditions})}/>
   <label className="flex gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I approve this recurring routing for matching future invoices; existing journals stay unchanged.</label>
  </fieldset>
  {save.error&&<p role="alert" className="text-sm text-destructive">{financeError(save.error)}</p>}
  {save.isSuccess&&<p role="status" className="text-sm">{save.data.message}</p>}
  {!manage&&<p className="text-sm text-muted-foreground">Account management, journal approval and unrestricted company access are required.</p>}
  <Button disabled={!manage||save.isPending||!confirmed||!data.account_id}>{save.isPending?'Saving…':'Save permanent routing'}</Button>
 </form>;
}