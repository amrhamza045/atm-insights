import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { financeError } from '@/components/finance/financeApi';
import useHealthReport from '@/components/finance/health/useHealthReport';
import HealthSummary from '@/components/finance/health/HealthSummary';
import HealthChecks from '@/components/finance/health/HealthChecks';
import HealthSources from '@/components/finance/health/HealthSources';
import HealthCoverage from '@/components/finance/health/HealthCoverage';
import HealthAdvice from '@/components/finance/health/HealthAdvice';
import HealthRepairs from '@/components/finance/health/HealthRepairs';
export default function FinanceHealthCheck({company,filters,can}){
 const {query,action,report}=useHealthReport(company,filters),[stale,setStale]=useState(false),busy=action.isPending||query.isFetching;
 return <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Financial health check</h2><p className="text-sm text-muted-foreground">End-to-end eligibility, mappings, automatic connections, journals and reporting. Scanning saves findings only; accounting entries and automation stay unchanged.</p></div><Button disabled={busy||!!query.error} onClick={()=>action.mutate({action:'health_run'},{onSuccess:()=>setStale(false)})}>{action.isPending?'Working…':'Run health check'}</Button></div><p className="text-xs text-muted-foreground">Uses the selected company, branch and date filters; blank dates default to this month through today in UTC. Scanning saves an evidence report, never changes accounting entries or enables automation.</p>
 {query.isPending&&<p role="status" className="text-sm">Loading latest report…</p>}{query.error&&<div role="alert" className="text-sm text-destructive">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></div>}{action.error&&<p role="alert" className="text-sm text-destructive">{financeError(action.error)}</p>}
 {!query.isPending&&!query.error&&!report&&<p className="border rounded-lg p-4 text-sm text-muted-foreground">No saved health report for this scope. Run a check to inspect account setup, live posting configuration, transaction evidence and financial areas that remain unconnected.</p>}
 {report&&<><HealthSummary report={report}/>{stale&&<p role="status" className="border rounded-lg p-3 text-sm">A repair was applied. This saved snapshot is now stale; run a new health check before relying on its results.</p>}<HealthChecks checks={report.summary.checks}/><HealthSources sources={report.summary.sources} busy={busy||stale} onContinue={source_entity=>action.mutate({action:'health_next',source_entity})}/><HealthCoverage domains={report.domains}/><HealthAdvice report={report} busy={busy||stale} onGenerate={()=>action.mutate({action:'health_advice'})}/><HealthRepairs key={`${report.id}:${JSON.stringify(filters)}`} company={company} report={report} filters={filters} can={can} onApplied={()=>setStale(true)}/><details><summary className="text-sm cursor-pointer">Scope and assurance limitations</summary><ul className="list-disc pl-5 mt-3 text-xs text-muted-foreground space-y-1">{report.limitations.map(l=><li key={l}>{l}</li>)}</ul></details></>}
 </section>;
}