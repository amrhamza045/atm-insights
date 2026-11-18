import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import AccountFields from '@/components/finance/accounts/AccountFields';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function FinanceAccountForm({company,account,onClose}) {
 const qc=useQueryClient();
 const save=useMutation({mutationFn:data=>financeCall({action:'save_account',company_id:company.id,id:account?.id,data}),onSuccess:()=>{qc.invalidateQueries({queryKey:['finance']});onClose();}});
 const submit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));save.mutate({...d,active:d.active==='on',posting:d.posting==='on',expected_updated_date:account?.updated_date});};
 return <Dialog open onOpenChange={v=>!v&&!save.isPending&&onClose()}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{account?'Edit account':'Add account'}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-3">
 <AccountFields company={company} account={account}/>
 {save.error&&<p role="alert" className="text-destructive text-sm">{financeError(save.error)}</p>}<Button disabled={save.isPending}>{save.isPending?'Saving…':'Save account'}</Button></form></DialogContent></Dialog>;
}