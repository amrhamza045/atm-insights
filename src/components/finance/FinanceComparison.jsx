import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { financeCall,financeError } from '@/components/finance/financeApi';
import ComparisonEntityPicker from '@/components/finance/comparison/ComparisonEntityPicker';
import ComparisonTable from '@/components/finance/comparison/ComparisonTable';
import ComparisonCharts from '@/components/finance/comparison/ComparisonCharts';
import ComparisonInsights from '@/components/finance/comparison/ComparisonInsights';
import downloadComparison from '@/components/finance/comparison/downloadComparison';
import FinanceVarianceAlerts from '@/components/finance/comparison/FinanceVarianceAlerts';
import ComparisonVarianceAnalysis from '@/components/finance/comparison/ComparisonVarianceAnalysis';
export default function FinanceComparison({company,filters,embedded=false,showConfiguration=true}){
 const [selected,setSelected]=useState([]),[unit,setUnit]=useState('month'),[generated,setGenerated]=useState(''),[selectionError,setSelectionError]=useState('');
 const input={action:'comparison',company_id:company.id,from:filters.from,to:filters.to,unit,targets:selected.map(({type,company_id,branch_id})=>({type,company_id,branch_id}))};
 const signature=JSON.stringify(input),generate=useMutation({mutationFn:payload=>financeCall(payload)});
 const add=t=>{if(selected.some(s=>s.type===t.type&&s.company_id===t.company_id&&s.branch_id===t.branch_id)){setSelectionError('This entity is already selected.');return;}setSelected([...selected,t]);setSelectionError('');};
 const report=generated===signature&&!generate.isPending?generate.data:null;
 const run=()=>{setGenerated(signature);generate.mutate(input);};
 return <section className="space-y-5"><header><h2 className="text-xl font-semibold">Branch and company comparisons</h2><p className="text-sm text-muted-foreground">Compare authorized branches, sister companies, mother companies and parent groups using posted financial records. Set shared From/To dates above; blank dates default to year-to-date.</p></header><ComparisonEntityPicker company={company} selected={selected} onAdd={add} onRemove={index=>{setSelected(selected.filter((_,i)=>i!==index));setSelectionError('');}} disabled={generate.isPending}/>{selectionError&&<p role="alert" className="text-sm text-destructive">{selectionError}</p>}<div className="flex flex-wrap items-end gap-3"><Label>Trend grouping<select aria-label="Comparison period grouping" className="block border rounded-md p-2 bg-background" value={unit} onChange={e=>setUnit(e.target.value)} disabled={generate.isPending}><option value="month">Monthly</option><option value="quarter">Quarterly</option><option value="year">Yearly</option></select></Label><Button disabled={selected.length<2||generate.isPending} onClick={run}>{generate.isPending?'Preparing comparison…':report?.ready===false?'Continue preparation':'Generate comparison'}</Button>{report?.ready&&<Button variant="outline" onClick={()=>downloadComparison(report)}>Download report CSV</Button>}</div>
 {!embedded&&showConfiguration&&<FinanceVarianceAlerts selected={selected} onLoad={targets=>{setSelected(targets);setSelectionError('');}}/>}
  {generate.isPending&&<p role="status" className="text-sm">Preparing authorized ledgers and comparison figures…</p>}{generate.error&&generated===signature&&<p role="alert" className="text-sm text-destructive">{financeError(generate.error)}</p>}{generated&&generated!==signature&&<p className="text-sm text-muted-foreground">Selections or dates changed. Generate a new comparison to update reports and AI insights.</p>}{report?.ready===false&&<p role="status" className="text-sm">{report.message} {report.remaining} journals remain in the current preparation batch.</p>}
 {report?.ready&&<><p className="text-sm text-muted-foreground">{report.from} to {report.to} · {report.currency} · Generated {new Date(report.refreshed_at).toLocaleString()}</p><section className="border rounded-lg p-4 space-y-2 text-sm"><h3 className="font-semibold">Scope and data coverage</h3>{report.rows.map(r=><p key={r.id}><strong>{r.label}:</strong> {r.members.join(', ')} · {r.recorded_lines} recorded period lines · {r.pending} pending proposals · {r.posting_issues} blocked postings.</p>)}{report.notes.map(note=><p key={note} className="text-muted-foreground">{note}</p>)}</section><ComparisonTable report={report}/><ComparisonCharts report={report}/><ComparisonVarianceAnalysis key={report.refreshed_at} report={report}/>{!embedded&&<ComparisonInsights key={report.refreshed_at} report={report}/>}</>}
 </section>;
}