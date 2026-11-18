import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover,PopoverTrigger,PopoverContent } from '@/components/ui/popover';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
export default function TaxRulePicker({companyId,kind,date,direction,value,onChange,allowNone=false}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');const query=useFinanceList({action:'tax_rules',company_id:companyId,kind,entry_date:date,direction,search},open&&!!date);
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start truncate" disabled={!date}>{value?`${value.code} · ${value.name} · v${value.version}`:allowNone?'No applicable tax (explanation required)':'Select configured tax rule…'}</Button></PopoverTrigger><PopoverContent className="w-80 space-y-2"><Input aria-label="Search configured tax rules" placeholder="Search tax code or profile" value={search} onChange={e=>setSearch(e.target.value)}/><div className="max-h-56 overflow-y-auto">{allowNone&&<Button type="button" variant="ghost" onClick={()=>{onChange(null);setOpen(false);}}>No applicable tax</Button>}{query.items.map(r=><button type="button" key={r.id} className="block w-full p-2 text-left text-sm hover:bg-muted" onClick={()=>{onChange(r);setOpen(false);}}>{r.code} · {r.name} · v{r.version}{r.kind!=='payroll'?` · ${r.rate}%`:''}</button>)}<FinanceListState query={query}/></div></PopoverContent></Popover>;
}