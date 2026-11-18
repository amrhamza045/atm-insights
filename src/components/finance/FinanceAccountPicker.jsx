import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
export default function FinanceAccountPicker({companyId,value,onChange,disabled=false,classification}) {
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');
 const query=useFinanceList({action:'read',view:'accounts',company_id:companyId,posting_only:true,search,classification},open);
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" disabled={disabled} variant="outline" className="w-full justify-start truncate">{value?.account_code?`${value.account_code} · ${value.account_name}`:'Map account…'}</Button></PopoverTrigger><PopoverContent className="w-80"><Input aria-label="Search accounts" placeholder="Search code or name" value={search} onChange={e=>setSearch(e.target.value)}/><div className="max-h-60 overflow-y-auto mt-2">{query.items.map(a=><button type="button" key={a.id} className="block w-full text-left p-2 text-sm hover:bg-muted rounded" onClick={()=>{onChange({account_id:a.id,account_code:a.code,account_name:a.name});setOpen(false);}}>{a.code} · {a.name}</button>)}<FinanceListState query={query}/></div></PopoverContent></Popover>;
}