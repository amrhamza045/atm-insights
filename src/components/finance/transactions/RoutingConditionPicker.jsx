import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import RoutingConditionChecklist from '@/components/finance/transactions/RoutingConditionChecklist';
export default function RoutingConditionPicker({companyId,field,label,value,currentLabel,onChange,disabled,conditions,mappingKey,optionsAction='transaction_routing_options',extraOptions=[],emptyLabel,required=false,multiple=false}){
 const [search,setSearch]=useState(''),term=useDebouncedValue(search),searchable=optionsAction==='mapping_condition_options'?!['payment_method','payment_type','currency'].includes(field):['branch_id','customer_id','event_id'].includes(field);
 const branch=field==='branch_id'?'':conditions.branch_id,customer=field==='event_id'?conditions.customer_id:'';
 const query=useInfiniteQuery({queryKey:['finance','routing-options',optionsAction,companyId,field,branch,customer,mappingKey,term],initialPageParam:null,queryFn:({pageParam})=>financeCall({action:optionsAction,company_id:companyId,field,search:term,branch_id:branch,customer_id:customer,mapping_key:mappingKey,cursor:pageParam}),getNextPageParam:p=>p.has_more?p.next_cursor:undefined,enabled:!disabled});
 const local=extraOptions.filter(o=>!term||o.label.toLowerCase().includes(term.toLowerCase()));
 const items=[...new Map([...local,...(query.data?.pages.flatMap(p=>p.items)||[])].map(o=>[o.value,o])).values()];
 return <div className="space-y-1 min-w-0">{multiple ? <RoutingConditionChecklist label={label} items={items} value={value} onChange={onChange} disabled={disabled}/> : <label className="text-sm block">{label}
 <select className="block w-full rounded-md border border-input bg-background p-2 text-sm disabled:opacity-50" disabled={disabled} required={required} value={value||''} onChange={e=>onChange(e.target.value,items.find(o=>o.value===e.target.value)?.label||'')}>
 <option value="">{emptyLabel||`Any ${label.toLowerCase()}`}</option>{value&&!items.some(o=>o.value===value)&&<option value={value}>{currentLabel||value}</option>}{items.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
 </select></label>}
 {searchable&&<Input aria-label={`Search ${label.toLowerCase()} options`} disabled={disabled} maxLength={80} placeholder={`Search ${label.toLowerCase()}…`} value={search} onChange={e=>setSearch(e.target.value)}/>}
 {query.isFetching&&<p role="status" className="text-xs text-muted-foreground">Loading choices…</p>}{query.isSuccess&&!items.length&&<p className="text-xs text-muted-foreground">No matching choices.</p>}
 {query.error&&<p role="alert" className="text-xs text-destructive">{financeError(query.error)}</p>}
 {query.hasNextPage&&<Button type="button" size="sm" variant="outline" disabled={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>Load more choices</Button>}
 </div>;
}