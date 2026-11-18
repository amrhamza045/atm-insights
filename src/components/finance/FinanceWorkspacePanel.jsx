import { useEffect, useState } from 'react';
import { useBranch } from '@/components/branches/BranchContext';
import FinanceWorkspaceTabs from '@/components/finance/FinanceWorkspaceTabs';
import useFinanceList from '@/components/finance/useFinanceList';
export default function FinanceWorkspacePanel({company,can,onCreateCompany,companies,onSelectCompany}) {
 const branches=useFinanceList({action:'branches',company_id:company.id});
 // One branch picked in the header filters Finance to it; a whole company shows all its branches.
 const {selectedCompany,selectedBranchId}=useBranch();
 const headerBranch=!selectedCompany&&branches.items.some(b=>b.id===selectedBranchId)?selectedBranchId:'';
 const [filters,setFilters]=useState({from:'',to:'',branch_id:headerBranch});
 useEffect(()=>setFilters(f=>({...f,branch_id:headerBranch})),[headerBranch]);
 return <div className="space-y-6"><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong>{company.name}</strong>{company.company_code&&<span className="text-muted-foreground"> · {company.company_code}</span>}</span><span>{company.currency} · {company.currency_decimals} decimals</span><span>{company.edition.replaceAll('_',' ')}</span><span>Posting lock: {company.closed_through||'None'}</span>{company.is_test&&<strong className="text-destructive">TEST COMPANY — NOT PRODUCTION</strong>}</div>
 <FinanceWorkspaceTabs company={company} can={can} branches={branches.items} branchQuery={branches} filters={filters} onFiltersChange={setFilters} onCreateCompany={onCreateCompany} companies={companies} onSelectCompany={onSelectCompany}/></div>;
}