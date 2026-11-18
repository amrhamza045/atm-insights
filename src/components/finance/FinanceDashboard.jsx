import { useState } from 'react';
import { useQuery,useQueryClient,useIsFetching } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import BranchTrendView from '@/components/finance/trends/BranchTrendView';
import financePreparedCall from '@/components/finance/financePreparedCall';
import { financeError } from '@/components/finance/financeApi';
import FinanceDashboardCards from '@/components/finance/FinanceDashboardCards';
import FinanceDashboardControls from '@/components/finance/FinanceDashboardControls';
import FinancePeriodTrend from '@/components/finance/FinancePeriodTrend';
import FinanceStatementTable from '@/components/finance/FinanceStatementTable';
import FinanceCalendarFilters from '@/components/finance/FinanceCalendarFilters';
import FinanceProfitabilityRatios from '@/components/finance/FinanceProfitabilityRatios';
import FinanceDashboardComparison from '@/components/finance/FinanceDashboardComparison';
export default function FinanceDashboard({company,filters,onFiltersChange}){
 const [unit,setUnit]=useState('month'),[view,setView]=useState('position'),qc=useQueryClient(),trendBusy=useIsFetching({queryKey:['finance','branch-trends',company.id]});
 const query=useQuery({queryKey:['finance','dashboard',company.id,filters,unit],queryFn:({signal})=>financePreparedCall({action:'dashboard',company_id:company.id,...filters,unit},signal),retry:false,enabled:view==='position',staleTime:60000,refetchInterval:120000,refetchOnWindowFocus:true}),data=query.data;
 const refresh=()=>{query.refetch();qc.invalidateQueries({queryKey:['finance','summary']});};
 return <section className="space-y-5"><div className="flex flex-wrap gap-2" aria-label="Dashboard views">{[['position','Financial position'],['trends','Branch growth & seasonality']].map(([key,label])=><Button key={key} variant={view===key?'default':'outline'} aria-pressed={view===key} disabled={query.isFetching||trendBusy>0} onClick={()=>setView(key)}>{label}</Button>)}</div>{view==='trends'?<BranchTrendView key={company.id} company={company}/>:<><div><h2 className="text-xl font-semibold">Financial position dashboard</h2><p className="text-sm text-muted-foreground">Posted-ledger overview, refreshed every two minutes while open or whenever you choose. Compare revenue, expenses and profitability by year, quarter or month, or use custom dates and branch filters.</p></div><FinanceCalendarFilters today={data?.today} filters={filters} onFiltersChange={onFiltersChange}/><FinanceDashboardControls today={data?.today} filters={filters} onFiltersChange={onFiltersChange} unit={unit} onUnitChange={setUnit} busy={query.isFetching} onRefresh={refresh}/>
 <FinanceDashboardComparison key={company.id} company={company} filters={filters}/>
  {query.isPending&&<p className="text-sm">Preparing financial position and period analysis…</p>}{query.error&&<p role="alert" className="text-destructive">{financeError(query.error)}</p>}{data?.ready===false&&<p className="text-sm">{data.remaining} journals still need report preparation. Refresh to continue; partial financial positions are not shown.</p>}
 {data?.ready&&<><p className="text-sm text-muted-foreground">{data.from} to {data.to} · {company.currency} · Updated {new Date(data.refreshed_at).toLocaleString()}</p><div role="status" className="border rounded-lg p-3 text-sm">{!data.has_activity&&'No posted activity in this range. '}{data.pending} pending proposals and {data.posting_issues} blocked postings excluded. Historical reconstruction remains incomplete; this is the recorded position, not assurance of complete business accounts.</div><FinanceDashboardCards data={data} company={company}/><FinancePeriodTrend rows={data.trend} company={company}/><FinanceProfitabilityRatios data={data}/><div className="grid lg:grid-cols-2 gap-4">{[['Profit and loss','profit_loss'],['Balance sheet at end date','balance_sheet'],['Cash flow','cash_flow'],['Changes in equity','equity_changes']].map(([title,key])=><FinanceStatementTable title={title} key={key} rows={data[key]} company={company}/>)}</div><section className="border rounded-lg p-4 text-xs text-muted-foreground space-y-2"><h3 className="font-semibold text-foreground">Basis and data coverage</h3>{data.notes.map(note=><p key={note}>{note}</p>)}</section></>}
 </>}</section>;
 }