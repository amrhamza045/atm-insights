import { useState } from 'react';
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ReferenceLine,ResponsiveContainer } from 'recharts';
import { Label } from '@/components/ui/label';
import { financeAmount } from '@/components/finance/financeApi';
export default function ComparisonVarianceChart({analysis,metrics,report}){
 const [metric,setMetric]=useState('net_margin'),meta=metrics.find(m=>m.key===metric);
 const data=analysis.rows.map(r=>({name:r.label,value:r.deltas[metric]})),unit=meta.format==='points'?'percentage points':report.currency;
 return <section className="border rounded-lg p-4 space-y-3"><Label className="block">Profitability variance chart<select aria-label="Profitability variance chart metric" className="block border rounded-md p-2 bg-background" value={metric} onChange={e=>setMetric(e.target.value)}>{metrics.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></Label><p className="text-sm text-muted-foreground">{meta.label} vs {analysis.baseline_label} · {unit}</p><ResponsiveContainer width="100%" height={320}><BarChart data={data} margin={{bottom:55}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" angle={-20} textAnchor="end" height={85} interval={0}/><YAxis/><ReferenceLine y={0} stroke="hsl(var(--foreground))"/><Tooltip formatter={value=>value==null?'Not available':`${financeAmount(value,{currency_decimals:meta.format==='points'?2:report.currency_decimals})} ${unit}`}/><Bar dataKey="value" name={meta.label} fill="hsl(var(--chart-2))"/></BarChart></ResponsiveContainer></section>;
}