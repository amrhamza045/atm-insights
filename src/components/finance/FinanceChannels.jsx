import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeError } from '@/components/finance/financeApi';
import financePreparedCall from '@/components/finance/financePreparedCall';
import FinanceChannelTable from '@/components/finance/FinanceChannelTable';
export default function FinanceChannels({company,filters}){
 const [dimension,setDimension]=useState('service_type'),query=useQuery({queryKey:['finance','channels',company.id,filters],queryFn:({signal})=>financePreparedCall({action:'channels',company_id:company.id,...filters},signal),retry:false,staleTime:60000}),data=query.data;
 return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">Channel profitability</h2><p className="text-sm text-muted-foreground">Recorded contribution before unassigned costs; all three breakdowns use the date and branch filters above.</p></div><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh analysis</Button></div><label className="flex items-center gap-2 text-sm">Break down by<select className="border rounded-md p-2 bg-background" value={dimension} onChange={e=>setDimension(e.target.value)}><option value="service_type">Service type</option><option value="order_origin">Order source</option><option value="delivery_partner_id">Delivery partner</option></select></label>
 {query.isPending&&<p>Preparing channel reporting dimensions…</p>}{query.error&&<p role="alert" className="text-destructive">{financeError(query.error)}</p>}{data?.ready===false&&<p className="text-sm">{data.remaining} journals still need channel preparation; refresh to continue.</p>}
 {data?.ready&&<><p className="text-xs text-muted-foreground">{data.from} to {data.to} · {company.currency} · Updated {new Date(data.refreshed_at).toLocaleString()}</p><div className="border rounded-lg bg-card p-4">{data.dimensions[dimension].length?<FinanceChannelTable rows={data.dimensions[dimension]} company={company}/>:<p className="text-sm text-muted-foreground">No posted P&L activity for this period and branch.</p>}</div><div className="space-y-2 text-xs text-muted-foreground">{data.notes.map(note=><p key={note}>{note}</p>)}</div></>}
 </section>;
}