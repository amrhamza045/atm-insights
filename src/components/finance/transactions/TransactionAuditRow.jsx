import { Fragment, useId, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { financeAmount } from '@/components/finance/financeApi';
import TransactionAuditDetails from '@/components/finance/transactions/TransactionAuditDetails';
export default function TransactionAuditRow({row,company,onInspect}){
 const [expanded,setExpanded]=useState(false),detailsId=useId();
 return <Fragment><tr className="border-t align-top">
  <td className="p-2"><Button variant="ghost" size="icon" aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded?'Collapse':'Expand'} details for ${row.description}`} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minus/>:<Plus/>}</Button></td>
  <td className="p-3 whitespace-nowrap">{row.date||'Not recorded'}</td>
  <td className="p-3 font-medium min-w-48">{row.description}{row.purchase_orders?.map(order=><p key={order.id} className="text-xs text-muted-foreground mt-1 break-words">{order.order_number}</p>)}</td>
  <td className="p-3 text-muted-foreground">{row.sources.map(s=>s.name).filter((name,i,names)=>names.indexOf(name)===i).join(' / ')}</td>
  <td className="p-3 text-right whitespace-nowrap tabular-nums">{row.amount==null?'Not recorded':financeAmount(row.amount,company)}</td>
  <td className="p-3 space-y-1">{row.mapping&&<span className="block rounded border px-2 py-1 text-xs">{row.mapping.status==='ready'?'Routing configured':row.mapping.status==='unsupported'?'Source connection required':'Automatic routing needed'}</span>}<span className="inline-block rounded border px-2 py-1 text-xs whitespace-nowrap">{row.status==='missing'?'No posted journal':row.status==='pending'?'Pending review':'Posted journal found'}</span></td>
 </tr><tr id={detailsId} hidden={!expanded} className="border-t bg-muted/40"><td colSpan={6}>{expanded&&<TransactionAuditDetails row={row} company={company} onInspect={onInspect}/>}</td></tr></Fragment>;
}