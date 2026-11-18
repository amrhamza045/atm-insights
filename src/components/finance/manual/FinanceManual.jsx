import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import FinanceManualSection from '@/components/finance/manual/FinanceManualSection';

export default function FinanceManual({company}) {
 const [selected,setSelected]=useState('overview');
 const query=useQuery({queryKey:['finance','manual',company?.id||'general'],queryFn:()=>financeCall({action:'manual',...(company?.id?{company_id:company.id}:{})}),staleTime:60000,refetchOnWindowFocus:true});
 const data=query.data,section=data?.sections.find(item=>item.id===selected)||data?.sections[0];
 return <section className="space-y-5">
  <header className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-xl font-semibold">Finance manual</h2><p className="text-sm text-muted-foreground mt-1">Section descriptions, report interpretation, accuracy checks and recommendations.</p></div><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>{query.isFetching?'Loading…':'Refresh manual'}</Button></header>
  {query.isPending&&<p role="status" className="text-sm">Loading the Finance guide…</p>}
  {query.error&&<div role="alert" className="text-sm text-destructive">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></div>}
  {data&&<><div className="rounded-lg border bg-muted p-4 text-sm space-y-2"><p><strong>Automatic maintenance: </strong>{data.schedule}. The guide always reads the deployed Finance definitions.</p><p className="text-muted-foreground">{data.sections.length} accessible sections · {data.sections.reduce((n,s)=>n+s.reports.length,0)} report guides · Version {data.version.slice(0,12)}</p><p className="text-muted-foreground">{data.verification_current?`Last verified ${new Date(data.last_checked_at).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})} (Africa/Cairo).`:'The latest guide is available; scheduled/publication verification has not yet recorded this version.'}</p><p>This is operational guidance, not assurance of complete accounts or a filed tax return.</p></div><div className="grid gap-5 lg:grid-cols-[minmax(12rem,1fr)_3fr]"><nav aria-label="Finance manual contents" className="rounded-lg border p-3 space-y-1 h-fit">{data.sections.map(item=><Button key={item.id} variant={section?.id===item.id?'secondary':'ghost'} aria-current={section?.id===item.id?'page':undefined} onClick={()=>setSelected(item.id)} className="w-full justify-start h-auto whitespace-normal text-left">{item.title}</Button>)}</nav>{section&&<FinanceManualSection section={section}/>}</div></>}
 </section>;
}