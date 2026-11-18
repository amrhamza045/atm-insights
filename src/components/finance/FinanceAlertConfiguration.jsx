import { useState } from 'react';
import ComparisonEntityPicker from '@/components/finance/comparison/ComparisonEntityPicker';
import FinanceVarianceAlerts from '@/components/finance/comparison/FinanceVarianceAlerts';
export default function FinanceAlertConfiguration({company}){
 const [selected,setSelected]=useState([]),[error,setError]=useState('');
 const add=target=>{if(selected.some(s=>s.type===target.type&&s.company_id===target.company_id&&s.branch_id===target.branch_id)){setError('This entity is already selected.');return;}setSelected([...selected,target]);setError('');};
 return <section className="space-y-4"><div><h2 className="text-lg font-semibold">Branch alert settings</h2><p className="text-sm text-muted-foreground">Configure the branches monitored by the existing weekly variance alerts. Use Analytics for ad hoc comparisons.</p></div><ComparisonEntityPicker company={company} selected={selected} onAdd={add} onRemove={index=>{setSelected(selected.filter((_,i)=>i!==index));setError('');}}/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<FinanceVarianceAlerts selected={selected} onLoad={targets=>{setSelected(targets);setError('');}}/></section>;
}