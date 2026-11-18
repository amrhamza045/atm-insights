import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import WasteReasonEditor from './WasteReasonEditor';
import { WASTE_GROUPS } from './wasteGroups';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function WasteReasons({company,can}){
 const [search,setSearch]=useState(''),[editor,setEditor]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cache=useQueryClient(),query=useFinanceList({action:'waste_reasons',company_id:company.id,search}),editable=can('finance_accounts_manage');
 const refresh=()=>Promise.all([cache.invalidateQueries({queryKey:['finance']}),cache.invalidateQueries({queryKey:['wasteReasons']})]);
 const toggle=async(r,is_active)=>{setBusy(true);setError('');try{await financeCall({action:'waste_reason_toggle',company_id:company.id,id:r.id,expected_updated_date:r.updated_date,is_active});await refresh();}catch(e){setError(financeError(e));}finally{setBusy(false);}};
 return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Waste reasons</h3><p className="text-sm text-muted-foreground">Reasons offered in Inventory › Declare Waste, each linked to a GL account.</p></div>{editable&&<Button disabled={busy} onClick={()=>setEditor({})}>Add waste reason</Button>}</div>
 <p className="rounded-md border bg-muted p-3 text-sm">Active reasons replace the built-in list in the waste popup for {company.name}'s branches. Until at least one is active, the built-in six reasons are shown. Deactivating a reason hides it from new declarations; past declarations keep the reason they were saved with.</p>
 <Input aria-label="Search waste reasons" placeholder="Search name or code" value={search} onChange={e=>setSearch(e.target.value)}/>{error&&<p role="alert" className="text-destructive">{error}</p>}
 <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{['Reason','Code','Reporting group','GL account','Active','Actions'].map(l=><th key={l} className="p-3 text-left">{l}</th>)}</tr></thead><tbody>{query.items.map(r=><tr key={r.id} className="border-t"><td className="p-3 font-medium">{r.name}{r.treatment==='food_tasting'&&<span className="ml-2 rounded border px-1.5 py-0.5 text-xs font-normal">Food tasting</span>}</td><td className="p-3">{r.code}</td><td className="p-3">{WASTE_GROUPS[r.reason_group]||r.reason_group}</td><td className="p-3">{r.account_code} · {r.account_name}</td><td className="p-3"><Switch aria-label={`Active: ${r.name}`} checked={r.is_active} disabled={!editable||busy} onCheckedChange={v=>toggle(r,v)}/></td><td className="p-3">{editable&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>setEditor(r)}>Edit</Button>}</td></tr>)}</tbody></table></div>
 <FinanceListState query={query}/>{editor&&<WasteReasonEditor company={company} reason={editor.id?editor:null} onClose={()=>setEditor(null)} onSaved={refresh}/>}</section>;
}