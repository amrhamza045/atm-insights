import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover,PopoverContent,PopoverTrigger } from '@/components/ui/popover';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
export default function AccountParentPicker({companyId,initialValue='',accountCode}){
 const [value,setValue]=useState(initialValue),[open,setOpen]=useState(false),[search,setSearch]=useState('');
 const query=useFinanceList({action:'read',view:'accounts',company_id:companyId,parent_only:true,search},open);
 return <div className="space-y-2"><Input name="parent_code" aria-label="Parent account code" value={value} onChange={e=>setValue(e.target.value)} maxLength={12} placeholder="Blank for a root group"/><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" size="sm" variant="outline">Choose parent group</Button></PopoverTrigger><PopoverContent className="w-80 space-y-2"><Input aria-label="Search parent groups" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code, English or Arabic name"/><Button type="button" variant="ghost" onClick={()=>{setValue('');setOpen(false);}}>No parent (root group)</Button><div className="max-h-60 overflow-y-auto">{query.items.filter(a=>a.code!==accountCode).map(a=><Button key={a.id} type="button" variant="ghost" className="w-full justify-start h-auto whitespace-normal text-start" onClick={()=>{setValue(a.code);setOpen(false);}}>{a.code} · {a.name}</Button>)}</div><FinanceListState query={query}/></PopoverContent></Popover></div>;
}