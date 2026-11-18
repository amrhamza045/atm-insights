import { useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import auditRoutingPriority from '@/components/finance/transactions/auditRoutingPriority';
import TransactionRoutingConflicts from '@/components/finance/transactions/TransactionRoutingConflicts';
import TransactionRoutingConditions from '@/components/finance/transactions/TransactionRoutingConditions';
import TransactionRoutingSettings from '@/components/finance/transactions/TransactionRoutingSettings';
import TransactionRoutingReview from '@/components/finance/transactions/TransactionRoutingReview';
import TransactionSavedRouting from '@/components/finance/transactions/TransactionSavedRouting';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function TransactionRoutingEditor({company,detail,can}){
 const semantic=detail.routing.kind==='semantic',keys=semantic?detail.routing.keys:[];
 const [key,setKey]=useState(keys.find(k=>detail.reason.includes(k))||keys[0]||''),[account,setAccount]=useState({}),[map,setMap]=useState({}),[labels,setLabels]=useState({}),[from,setFrom]=useState(semantic?(detail.mapping?.checked_date||new Date().toISOString().slice(0,10)):company.auto_post_from||detail.mapping?.checked_date||detail.source_date||''),[confirmed,setConfirmed]=useState(false),qc=useQueryClient();
 const [rule,setRule]=useState(()=>({effective_to:'',priority:100,notes:'',conditions:{...(detail.branch_id?{branch_id:detail.branch_id}:{}),...(key==='PAYMENT_METHOD_ACC'&&detail.routing.payment_method?{payment_method:detail.routing.payment_method}:{})},labels:{...detail.routing.labels,payment_method:detail.routing.payment_method}}));
 const conditions=rule.conditions,plan=auditRoutingPriority(detail.routing.bindings,key,from,conditions,rule.effective_to);
 const saved=useQuery({queryKey:['finance','audit-routing',company.id],queryFn:()=>financeCall({action:'read',view:'auto_mapping_details',company_id:company.id}),enabled:!semantic});
 const save=useMutation({mutationFn:()=>financeCall({action:'transaction_routing_save',company_id:company.id,source_entity:detail.source_entity,source_id:detail.source_id,confirmed,from,account_map:map,data:{mapping_key:key,account_id:account.account_id,effective_from:from,effective_to:rule.effective_to,priority:rule.priority,conditions,notes:rule.notes}}),onSuccess:()=>{setConfirmed(false);qc.invalidateQueries({queryKey:['finance']});},onError:()=>setConfirmed(false)});
 const manage=can('finance_journal_approve')&&(semantic?can('finance_accounts_manage'):can('finance_company_manage'));
 // Cash and bank accounts are set only in Payment methods.
 const paymentKey=semantic&&key==='PAYMENT_METHOD_ACC';
 const patch=next=>{if('effective_from' in next){setFrom(next.effective_from);const {effective_from,...rest}=next;setRule(r=>({...r,...rest}));}else setRule(r=>({...r,...next}));setConfirmed(false);save.reset();};
 return <form className="border rounded-lg p-4 space-y-4" onSubmit={e=>{e.preventDefault();save.mutate();}}><h4 className="font-semibold">{semantic?'Define future automatic mapping':'Define and enable suggested routing'}</h4>
 <p className="text-sm text-muted-foreground">{semantic?`Required account keys for this transaction: ${keys.join(' and ')}. Configure each key separately. Rules apply to eligible matching payments, including future events; they do not enable unsupported transaction types.`:'These mappings apply company-wide to the same operational accounts, not just this transaction. Saving enables operational posting from the date below and retains unrelated mappings.'}</p>
 <fieldset disabled={!manage||save.isPending} className="space-y-4">
 {semantic?<><label className="text-sm block">Routing key<select className="block w-full border border-input rounded-md p-2 bg-background" value={key} onChange={e=>{setKey(e.target.value);setAccount({});setConfirmed(false);save.reset();}}>{keys.map(k=><option key={k}>{k}</option>)}</select></label>
 <div className="text-sm">Destination chart account<FinanceAccountPicker companyId={company.id} value={account} onChange={a=>{setAccount(a);setConfirmed(false);save.reset();}} disabled={!manage||save.isPending}/></div>
 <TransactionRoutingSettings data={{...rule,effective_from:from}} onChange={patch} disabled={!manage||save.isPending}/>
 <TransactionRoutingConditions companyId={company.id} detail={detail} mappingKey={key} data={rule} onChange={patch} disabled={!manage||save.isPending}/>
 <TransactionRoutingConflicts plan={plan}/><TransactionRoutingReview detail={detail} from={from} data={rule} account={account}/></>:<><label className="block text-sm">Effective from<Input required type="date" value={from} onChange={e=>{setFrom(e.target.value);setConfirmed(false);save.reset();}}/></label>
 {detail.routing.accounts.map(gl=><div key={gl.id} className="block text-sm">{gl.code||gl.id} · {gl.name||'Operational account'}<FinanceAccountPicker companyId={company.id} disabled={!manage||save.isPending} value={labels[gl.id]||saved.data?.[gl.id]} onChange={a=>{setMap(m=>({...m,[gl.id]:a.account_id}));setLabels(l=>({...l,[gl.id]:a}));setConfirmed(false);save.reset();}}/></div>)}<p className="text-xs text-muted-foreground">This legacy operational adapter supports account substitutions and a start date only; payment-specific conditions are available on supported catering payment mappings.</p></>}
 <label className="flex gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm the destination, conditions, dates and recurring automatic routing; posted journals will not change.</label>
 </fieldset>
 {paymentKey&&<p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">PAYMENT_METHOD_ACC is not routed here. The cash or bank account comes from the payment method used: add or edit it in Mapping Accounts › Payment methods (an older code such as "{detail.routing.payment_method}" can be added to an existing method).</p>}
 {!manage&&<p className="text-sm text-muted-foreground">Company-wide routing access and account-management or company-management permission are required.</p>}{save.error&&<p role="alert" className="text-sm text-destructive">{financeError(save.error)}</p>}{save.isSuccess&&<TransactionSavedRouting result={save.data}/>}
 <Button disabled={!manage||save.isPending||!confirmed||paymentKey||semantic&&!account.account_id}>{save.isPending?'Saving…':semantic?'Save or reuse future mapping':'Save and enable operational routing'}</Button></form>;
}