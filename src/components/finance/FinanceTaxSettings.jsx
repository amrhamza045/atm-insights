import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function FinanceTaxSettings({company,mappings,can}){
 const [output,setOutput]=useState(mappings.output),[input,setInput]=useState(mappings.input),qc=useQueryClient();
 const save=useMutation({mutationFn:()=>financeCall({action:'save_tax_config',company_id:company.id,data:{output_account_id:output?.account_id,input_account_id:input?.account_id}}),onSuccess:()=>qc.invalidateQueries({queryKey:['finance']})});
 return <section className="border rounded-lg p-4 space-y-3 bg-card"><h3 className="font-semibold">VAT reconciliation account mappings</h3><p className="text-sm text-muted-foreground">Select your actual output VAT liability and recoverable input VAT asset accounts. These mappings affect this comparison only, not tax rates or existing postings.</p><div className="grid sm:grid-cols-2 gap-3"><Label className="space-y-2">Output VAT payable<FinanceAccountPicker companyId={company.id} value={output} onChange={setOutput} disabled={!can('finance_accounts_manage')||save.isPending}/></Label><Label className="space-y-2">Recoverable input VAT<FinanceAccountPicker companyId={company.id} value={input} onChange={setInput} disabled={!can('finance_accounts_manage')||save.isPending}/></Label></div>{can('finance_accounts_manage')&&<Button disabled={save.isPending||!output||!input} onClick={()=>save.mutate()}>{save.isPending?'Saving…':'Save VAT mappings'}</Button>}{save.error&&<p role="alert" className="text-destructive text-sm">{financeError(save.error)}</p>}{save.isSuccess&&<p className="text-sm">VAT mappings saved.</p>}</section>;
}