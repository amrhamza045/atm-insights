import { useState,Suspense } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import { Button } from '@/components/ui/button';
const FinanceComparison=lazy(()=>import('@/components/finance/FinanceComparison'));
export default function FinanceDashboardComparison({company,filters}){
 const [open,setOpen]=useState(false);
 return <section className="space-y-4"><Button variant="outline" aria-expanded={open} aria-controls="finance-dashboard-comparison" onClick={()=>setOpen(value=>!value)}>{open?'Hide comparison tool':'Compare branches & companies'}</Button>{open&&<div id="finance-dashboard-comparison" className="border rounded-lg p-4"><Suspense fallback={<p role="status" className="text-sm">Loading comparison tool…</p>}><FinanceComparison key={company.id} company={company} filters={filters} embedded/></Suspense></div>}</section>;
}