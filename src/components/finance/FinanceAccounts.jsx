import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { financeCall,financeError } from '@/components/finance/financeApi';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import FinanceAccountForm from '@/components/finance/FinanceAccountForm';
import AccountTable from '@/components/finance/accounts/AccountTable';
import AccountImportDialog from '@/components/finance/accounts/AccountImportDialog';
import AccountCleanupDialog from '@/components/finance/accounts/AccountCleanupDialog';
import AccountExportButton from '@/components/finance/accounts/AccountExportButton';
export default function FinanceAccounts({company,can}) {
 const [search,setSearch]=useState(''),[editor,setEditor]=useState(null),[importing,setImporting]=useState(false),[cleanup,setCleanup]=useState(false),[selected,setSelected]=useState([]),[status,setStatus]=useState(''),[kind,setKind]=useState(''),qc=useQueryClient();
 const query=useFinanceList({action:'read',view:'accounts',company_id:company.id,search,account_status:status,account_kind:kind});
 const editable=can('finance_accounts_manage'),resetSelection=fn=>value=>{fn(value);setSelected([]);};
 const select=(id,checked)=>setSelected(prev=>checked?[...new Set([...prev,id])]:prev.filter(v=>v!==id));
 const selectPage=checked=>setSelected(prev=>checked?[...new Set([...prev,...query.items.map(a=>a.id)])]:prev.filter(id=>!query.items.some(a=>a.id===id)));
 const seed=useMutation({mutationFn:()=>financeCall({action:'install_template',company_id:company.id}),onSuccess:()=>qc.invalidateQueries({queryKey:['finance']})});
 return <section className="space-y-4"><div className="flex flex-wrap gap-2"><Input aria-label="Search chart of accounts" className="max-w-sm" placeholder="Search code, English or Arabic name" value={search} onChange={e=>resetSelection(setSearch)(e.target.value)}/><select aria-label="Account status filter" className="border rounded p-2 bg-background" value={status} onChange={e=>resetSelection(setStatus)(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><select aria-label="Account posting filter" className="border rounded p-2 bg-background" value={kind} onChange={e=>resetSelection(setKind)(e.target.value)}><option value="">Posting and groups</option><option value="posting">Posting accounts</option><option value="group">Groups</option></select><AccountExportButton company={company}/>{editable&&<><Button variant="outline" disabled={seed.isPending} onClick={()=>seed.mutate()}>{seed.isPending?'Installing…':'Install missing template accounts'}</Button><Button variant="outline" onClick={()=>setImporting(true)}>Import Excel / CSV</Button><Button onClick={()=>setEditor({})}>Add account</Button></>}</div>
 <p className="text-sm text-muted-foreground">Edit parent, normal balance, posting/group type, reporting mappings, status, effective dates and cash-flow settings. Arabic names remain blank until entered. Delete only unused, unreferenced accounts; deactivate others after removing active mappings. Template installation adds missing original-template accounts, not the attached chart.</p>
 {editable&&<div className="flex flex-wrap items-center gap-3"><span className="text-sm">{selected.length} selected</span><Button variant="outline" disabled={!selected.length} onClick={()=>setCleanup(true)}>Clean up selected accounts</Button>{selected.length>0&&<Button variant="ghost" onClick={()=>setSelected([])}>Clear selection</Button>}<span className="text-xs text-muted-foreground">Selection covers loaded rows; use Load more to include more accounts.</span></div>}
 {seed.error&&<p role="alert" className="text-destructive">{financeError(seed.error)}</p>}{seed.isSuccess&&<p className="text-sm">{seed.data.added} missing accounts installed.</p>}
 <AccountTable accounts={query.items} editable={editable} selected={selected} onSelect={select} onSelectPage={selectPage} onEdit={setEditor}/>
 <FinanceListState query={query}/>{editor&&<FinanceAccountForm company={company} account={editor.id?editor:null} onClose={()=>setEditor(null)}/>}{importing&&<AccountImportDialog company={company} onClose={()=>setImporting(false)}/>}{cleanup&&<AccountCleanupDialog company={company} ids={selected} onClose={()=>setCleanup(false)} onComplete={()=>setSelected([])}/>}</section>;
}