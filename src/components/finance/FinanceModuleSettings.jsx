import { useState } from 'react';
import { useMutation,useQueryClient,useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import { financeCall,financeError } from '@/components/finance/financeApi';
// Collections are not mapped here: they post to the account of the payment method used.
const roles={sales:'Net sales revenue',tax:'Sales tax payable',service:'Service charge revenue',delivery:'Delivery revenue',inventory:'Inventory asset',suppliers:'Supplier payables'};
export default function FinanceModuleSettings({company,can}) {
 const [map,setMap]=useState(company.module_policy?.map||{}),[labels,setLabels]=useState({}),[from,setFrom]=useState(company.module_policy?.from||new Date().toISOString().slice(0,10)),[confirmed,setConfirmed]=useState(false),qc=useQueryClient();
 const manage=can('finance_company_manage')&&can('finance_journal_approve');
 const details=useQuery({queryKey:['finance','module-map',company.id],queryFn:()=>financeCall({action:'module_mappings',company_id:company.id})});
 const save=useMutation({mutationFn:data=>financeCall({action:'configure_modules',company_id:company.id,data}),onSuccess:()=>qc.invalidateQueries({queryKey:['finance']})});
 return <form className="border rounded-lg p-4 space-y-4" onSubmit={e=>{e.preventDefault();save.mutate({enabled:true,from,map,confirmed});}}><h2 className="font-semibold">Sales and purchasing connections</h2><p className="text-sm">Status: <strong>{company.module_policy?.enabled?'Enabled':'Disabled'}</strong>. Sales post when paid; posted inventory invoices debit inventory and credit supplier payables.</p><p className="text-sm text-muted-foreground">Sale collections post to the cash or bank account of the payment method used (Mapping Accounts › Payment methods).</p><p className="text-sm text-muted-foreground">This phase does not infer inventory consumption, supplier settlements, payroll or loyalty rewards. Loyalty-funded sales, guest split checks and ambiguous payment methods remain blocked for reconciliation. Source currency must be {company.currency}; no currency conversion is inferred.</p>
 <label className="block max-w-sm text-sm">Automatic posting from<Input required type="date" value={from} disabled={!manage} onChange={e=>setFrom(e.target.value)}/></label>
 <div className="grid sm:grid-cols-2 gap-3">{Object.entries(roles).map(([key,label])=><label className="space-y-1 text-sm" key={key}>{label}<FinanceAccountPicker companyId={company.id} disabled={!manage} value={labels[key]||details.data?.[key]} onChange={a=>{setMap({...map,[key]:a.account_id});setLabels({...labels,[key]:a});}}/></label>)}</div>
 {manage&&<><label className="flex gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm source currency, account mappings and automatic posting of new transactions without individual approval.</label><div className="flex gap-2"><Button disabled={save.isPending||!confirmed}>Save and enable connections</Button>{company.module_policy?.enabled&&<Button type="button" variant="outline" disabled={save.isPending} onClick={()=>save.mutate({enabled:false})}>Disable connections</Button>}</div></>}
 {save.error&&<p role="alert" className="text-destructive text-sm">{financeError(save.error)}</p>}{save.isSuccess&&<p className="text-sm">Connection settings saved.</p>}
 </form>;
}