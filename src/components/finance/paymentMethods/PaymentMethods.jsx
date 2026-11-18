import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from '@/components/ui/alert-dialog';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import PaymentMethodEditor from '@/components/finance/paymentMethods/PaymentMethodEditor';
import PaymentMethodRow from '@/components/finance/paymentMethods/PaymentMethodRow';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function PaymentMethods({company,can}){
 const [search,setSearch]=useState(''),[editor,setEditor]=useState(null),[deleting,setDeleting]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cache=useQueryClient(),query=useFinanceList({action:'payment_methods',company_id:company.id,search}),editable=can('finance_accounts_manage');
 const refresh=async()=>{await Promise.all([cache.invalidateQueries({queryKey:['finance']}),cache.invalidateQueries({queryKey:['catering-payment-methods']}),cache.invalidateQueries({queryKey:['payment-method-choices']})]);};
 const change=async(method,action,extra={})=>{setBusy(true);setError('');try{await financeCall({action,company_id:company.id,id:method.id,expected_updated_date:method.updated_date,...extra});await refresh();}catch(e){setError(financeError(e));}finally{setBusy(false);setDeleting(null);}};
 return <section className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Payment methods</h3><p className="text-sm text-muted-foreground">The only place cash and bank accounts are set.</p></div>{editable&&<Button disabled={busy} onClick={()=>setEditor({})}>Add payment method</Button>}</div>
  <div className="rounded-md border bg-muted p-3 text-sm space-y-1">
   <p>Every flow posts to the account of the method used: catering and supplier payments, opening cash, expenses, payroll payments, staff advances and sales. Catering payments also need the CUSTOMER_ADVANCE_ACC liability mapping.</p>
   <p className="text-muted-foreground">The default method is used only when a record does not say how it was paid, and its journal says so. Older codes let transactions recorded under a previous code (for example "cash") post to the right method. Deactivation removes a method from new entries; history is kept.</p>
  </div>
  <Input aria-label="Search payment methods" placeholder="Search name or code" value={search} onChange={e=>setSearch(e.target.value)}/>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{['Method','Code','Mapped GL account','Active','Actions'].map(label=><th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{query.items.map(m=><PaymentMethodRow key={m.id} method={m} editable={editable} busy={busy} onToggle={(row,is_active)=>change(row,'payment_method_toggle',{is_active})} onEdit={setEditor} onDelete={setDeleting}/>)}</tbody></table></div>
  <FinanceListState query={query}/>
  {editor&&<PaymentMethodEditor company={company} method={editor.id?editor:null} onClose={()=>setEditor(null)} onSaved={refresh}/>}
  <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!busy)setDeleting(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>Only unused, inactive methods can be deleted. If linked transactions or accounting references exist, deletion will be refused; deactivate the method instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();change(deleting,'payment_method_delete');}}>{busy?'Checking…':'Delete unused method'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}