import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { financeCall,financeError } from '@/components/finance/financeApi';
import FinanceAutoMappings from '@/components/finance/FinanceAutoMappings';
import FinancePostingIssues from '@/components/finance/FinancePostingIssues';
import FinanceModuleSettings from '@/components/finance/FinanceModuleSettings';
import FinanceModuleHistory from '@/components/finance/FinanceModuleHistory';
export default function FinanceAutomaticPosting({company,can}) {
 const [map,setMap]=useState(company.auto_account_map||{}),[labels,setLabels]=useState({}),[from,setFrom]=useState(company.auto_post_from||new Date().toISOString().slice(0,10)),[confirmed,setConfirmed]=useState(false),[cursor,setCursor]=useState(null),qc=useQueryClient();
 const manage=can('finance_company_manage')&&can('finance_journal_approve');
 const save=useMutation({mutationFn:data=>financeCall({action:'configure_auto',company_id:company.id,data}),onSuccess:()=>{setCursor(null);qc.invalidateQueries({queryKey:['finance']});}});
 const sync=useMutation({mutationFn:c=>financeCall({action:'sync_auto',company_id:company.id,cursor:c||undefined}),onSuccess:data=>{setCursor(data.has_more?data.next_cursor:null);qc.invalidateQueries({queryKey:['finance']});}});
 const submit=e=>{e.preventDefault();save.mutate({enabled:true,from,account_map:map,source_currency:company.currency,confirmed});};
 return <section className="space-y-6"><FinanceModuleSettings company={company} can={can}/>{can('finance_reconstruct')&&<FinanceModuleHistory company={company}/>}<form onSubmit={submit} className="border rounded-lg p-4 space-y-4"><h2 className="font-semibold">Automatic operational journal posting</h2><p className="text-sm">Status: <strong>{company.auto_post_enabled?'Enabled':'Disabled'}</strong>{company.auto_post_enabled&&` · From ${company.auto_post_from}`}</p><p className="text-sm text-muted-foreground">Posted operational journals are copied into this company ledger without individual approval. Catering supplies these operational journals; sales and purchasing use the separate transaction connections above. Payroll, inventory consumption and loyalty integrations remain for the next phase. Manual proposals still require an independent reviewer.</p>
 <Label className="block max-w-sm">Start accounting date<Input type="date" required value={from} disabled={!manage} onChange={e=>setFrom(e.target.value)}/></Label>
 <FinanceAutoMappings company={company} map={map} setMap={setMap} labels={labels} setLabels={setLabels} disabled={!manage}/>
 {manage&&<><label className="flex gap-2 text-sm items-start"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm operational journals use {company.currency}, these mappings are correct, and validated entries may post without independent approval.</label><div className="flex flex-wrap gap-2"><Button disabled={save.isPending||!confirmed}>Save and enable automatic posting</Button>{company.auto_post_enabled&&<Button type="button" variant="outline" disabled={save.isPending} onClick={()=>save.mutate({enabled:false})}>Disable automatic posting</Button>}</div></>}
 {save.error&&<p role="alert" className="text-sm text-destructive">{financeError(save.error)}</p>}{save.isSuccess&&<p className="text-sm">Automatic posting settings saved.</p>}<p className="text-xs text-muted-foreground">New source journals trigger automatic posting. Use the batch action below for existing journals on or after the start date. Duplicate sources are skipped; missing mappings and locked dates appear as exceptions.</p></form>
 {company.auto_post_enabled&&can('finance_journal_approve')&&<section className="border rounded-lg p-4 space-y-3"><h3 className="font-semibold">Catch up existing operational journals</h3><Button disabled={sync.isPending} onClick={()=>sync.mutate(cursor)}>{sync.isPending?'Posting…':cursor?'Process next batch':'Process existing journals'}</Button>{sync.data&&<p className="text-sm">This batch: {sync.data.posted} posted · {sync.data.already_posted} already posted · {sync.data.blocked} blocked{sync.data.has_more?' · More journals remain.':' · Batch scan complete.'}</p>}{sync.error&&<p role="alert" className="text-destructive text-sm">{financeError(sync.error)}</p>}</section>}
 <FinancePostingIssues company={company} can={can}/></section>;
}