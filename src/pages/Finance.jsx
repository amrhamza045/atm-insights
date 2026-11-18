import { useState,useEffect,Suspense } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import { useBranch } from '@/components/branches/BranchContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import { Link } from 'react-router-dom';
import FinanceWorkspacePanel from '@/components/finance/FinanceWorkspacePanel';
import PayrollPayoutsButton from '@/components/finance/PayrollPayoutsButton';
const FinanceManual=lazy(()=>import('@/components/finance/manual/FinanceManual'));
export default function Finance() {
 const companies=useFinanceList({action:'setup'}),[selection,setSelection]=useState('');
 // Finance opens the company picked in the header and follows it when it changes.
 const {activeCompany,selectCompany,scopeReady}=useBranch();
 useEffect(()=>setSelection(''),[activeCompany?.id]);
 const headerId=companies.items.some(c=>c.id===activeCompany?.id)?activeCompany.id:'';
 const id=scopeReady?selection||headerId||companies.items[0]?.id:'',access=companies.data?.pages[0];
 // Picking a legal company here also switches the header picker to it.
 const pick=cid=>{setSelection(cid);selectCompany(cid);};
 const company=useQuery({queryKey:['finance','company',id],queryFn:()=>financeCall({action:'company_details',company_id:id}),enabled:!!id});
 const can=key=>!!(access?.is_admin||access?.permissions?.[key]);
 return <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6"><div className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-2xl font-semibold">Finance workspace</h1><p className="text-sm text-muted-foreground mt-1">Configuration, financial reporting and analytics for each legal company.</p></div><div className="flex flex-wrap gap-2"><PayrollPayoutsButton company={company.data}/>{can('finance_company_manage')&&<Button asChild variant="outline"><Link to="/Admin?tab=companies">Manage companies & branches</Link></Button>}</div></div>
 <div className="border rounded-lg p-4 bg-muted text-sm"><strong>Company accounting — historical reconstruction in progress.</strong><p className="mt-1">Legacy operational records remain unchanged. Enable automatic posting with company account mappings, or use independently reviewed manual proposals. Financial statements use posted company-ledger entries; missing historical balances and unconnected transaction sources still require reconciliation.</p></div>
 {(companies.isPending||companies.error)&&<FinanceListState query={companies}/>}
 {scopeReady&&!id&&!companies.isPending&&!companies.error&&<div className="border rounded-lg p-6 text-sm"><p>No authorized finance company is configured.</p><p className="text-muted-foreground mt-2">{can('finance_company_manage')?'Add your company and its branches in Admin › Companies, then install its chart of accounts here.':'Ask a finance administrator to configure your company membership and permissions.'}</p></div>}
 {scopeReady&&!id&&!companies.isPending&&!companies.error&&<Suspense fallback={<p role="status" className="text-sm">Loading Finance manual…</p>}><FinanceManual/></Suspense>}
 {(!scopeReady||(id&&company.isPending))&&<p className="text-sm">Loading company…</p>}{company.error&&<p role="alert" className="text-destructive">{financeError(company.error)}</p>}{company.data&&<FinanceWorkspacePanel key={company.data.id} company={company.data} can={can} companies={companies} onSelectCompany={pick}/>}</div>;
}