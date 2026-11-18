import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import FinanceStatementTable from '@/components/finance/FinanceStatementTable';
import FinanceTrialBalance from '@/components/finance/FinanceTrialBalance';
import financePreparedCall from '@/components/finance/financePreparedCall';
export default function FinanceStatements({company,filters}) {
 const query=useQuery({queryKey:['finance','statements',company.id,filters],queryFn:({signal})=>financePreparedCall({action:'statements',company_id:company.id,...filters},signal),retry:false,staleTime:60000,refetchInterval:120000,refetchOnWindowFocus:true});
 const data=query.data;
 return <section className="space-y-4"><div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="text-lg font-semibold">Financial statements · {company.currency}</h2><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>{query.isFetching?'Preparing…':'Refresh statements'}</Button></div>
 <p className="text-sm text-muted-foreground">Automatically configured from company accounts and refreshed every two minutes while open. Cash-flow overrides are available in Chart of accounts.</p>
 {query.isPending&&<p>Preparing posted ledger statements…</p>}{query.error&&<p role="alert" className="text-destructive">{financeError(query.error)}</p>}
 {data&&!data.ready&&<div className="border rounded-lg p-4 text-sm"><p>{data.remaining} journals still need reporting preparation; partial statements are not shown.</p><Button className="mt-3" disabled={query.isFetching} onClick={()=>query.refetch()}>Prepare next batch</Button></div>}
 {data?.ready&&<><p className="text-sm text-muted-foreground">{data.from} to {data.to} · Balance sheet as of {data.to} · Refreshed {new Date(data.refreshed_at).toLocaleString()}</p>
 {(data.pending>0||data.posting_issues>0||data.unclassified_cash!==0)&&<p role="status" className="border rounded-lg p-3 text-sm">Excluded: {data.pending} pending proposals and {data.posting_issues} blocked postings. {data.unclassified_cash!==0?'Mixed-journal cash flows require classification review.':''}</p>}
 <FinanceTrialBalance rows={data.trial_balance} company={company}/><div className="grid lg:grid-cols-2 gap-4">{[['Profit and loss','profit_loss'],['Balance sheet','balance_sheet'],['Cash flow statement','cash_flow'],['Changes in equity','equity_changes']].map(([title,key])=><FinanceStatementTable key={key} title={title} rows={data[key]} company={company}/>)}</div>
 <section className="border rounded-lg p-4 space-y-2"><h3 className="font-semibold">Statement notes and basis</h3>{data.notes.map(note=><p className="text-sm text-muted-foreground" key={note}>{note}</p>)}</section></>}
 </section>;
}