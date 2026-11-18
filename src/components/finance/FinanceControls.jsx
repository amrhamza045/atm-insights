import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { financeCall,financeError } from '@/components/finance/financeApi';
import FinanceParentControl from '@/components/finance/comparison/FinanceParentControl';
export default function FinanceControls({company,can}) {
 const qc=useQueryClient();
 const save=useMutation({mutationFn:payload=>financeCall({company_id:company.id,...payload}),onSuccess:()=>qc.invalidateQueries({queryKey:['finance']})});
 const lock=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));save.mutate({action:'lock_period',data:{...d,confirmed:d.confirmed==='on'}});};
 const members=e=>{e.preventDefault();save.mutate({action:'members',data:{member_emails:new FormData(e.currentTarget).get('emails').split(/[;,\n]/)}});};
 return <section className="space-y-6"><div className="border rounded-lg p-4 space-y-2"><h3 className="font-semibold">Period posting lock</h3><p className="text-sm">Locked through: {company.closed_through||'Not locked'}</p><p className="text-sm text-muted-foreground">Locks apply to this reconstructed company ledger, not the legacy operational ledger. Complete historical reconstruction and reconciliation first. Automated close checklists, accruals and depreciation are still pending.</p>{can('finance_period_close')&&<form onSubmit={lock} className="space-y-3"><Label className="block">Close through<Input name="closed_through" type="date" required/></Label><Label className="block">Reason<Textarea name="reason" required/></Label><label className="flex gap-2 text-sm"><input name="confirmed" type="checkbox" required/>I confirm historical reconstruction and reconciliations for this period have been reviewed. This lock only moves forward.</label><Button disabled={save.isPending}>Lock period</Button></form>}{company.locked_by&&<p className="text-xs text-muted-foreground">{company.locked_by} · {company.locked_at} · {company.lock_reason}</p>}</div>
 {can('finance_company_manage')&&<FinanceParentControl key={company.id+company.updated_date} company={company}/>}
 {can('finance_company_manage')&&<form onSubmit={members} className="border rounded-lg p-4 space-y-3"><h3 className="font-semibold">Company access</h3><Label className="block">Authorized existing staff emails<Textarea key={company.id+company.updated_date} name="emails" defaultValue={company.member_emails?.join('\n')} placeholder="One per line"/></Label><p className="text-sm text-muted-foreground">Staff need company membership and Financial Data viewing permission. Preparation, approval, reconstruction, account management and period locking each have separate permissions. Branch restrictions remain enforced.</p><Button disabled={save.isPending}>Save company access</Button></form>}
 {save.error&&<p role="alert" className="text-destructive">{financeError(save.error)}</p>}{save.isSuccess&&<p className="text-sm">Saved.</p>}</section>;
}