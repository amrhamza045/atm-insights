import { Suspense } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import { useQuery } from '@tanstack/react-query';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import { financeWorkspaceFeatures } from '@/components/finance/financeWorkspaceGroups';
import useFinanceWorkspaceNavigation from '@/components/finance/useFinanceWorkspaceNavigation';
import useScreenTabs from '@/hooks/useScreenTabs';
import ClosedTabsNotice from '@/components/modules/ClosedTabsNotice';
import FinanceWorkspaceFilters from '@/components/finance/FinanceWorkspaceFilters';
import FinanceSummary from '@/components/finance/FinanceSummary';
const views={
 company_definition:lazy(()=>import('@/components/finance/FinanceCompanyDefinition')),
 dashboard:lazy(()=>import('@/components/finance/FinanceDashboard')),
 comparison:lazy(()=>import('@/components/finance/FinanceComparison')),
 channels:lazy(()=>import('@/components/finance/FinanceChannels')),
 recipe_changes:lazy(()=>import('@/components/finance/FinanceRecipeChanges')),
 vat:lazy(()=>import('@/components/finance/FinanceVatReconciliation')),
 einvoices:lazy(()=>import('@/components/finance/FinanceTaxDocuments')),
 tax_system:lazy(()=>import('@/components/finance/FinanceTaxSystem')),
 tax_rules:lazy(()=>import('@/components/finance/FinanceTaxSystem')),
 vat_settings:lazy(()=>import('@/components/finance/FinanceVatConfiguration')),
 variance_alerts:lazy(()=>import('@/components/finance/FinanceAlertConfiguration')),
 accounts:lazy(()=>import('@/components/finance/FinanceAccounts')),
 proposals:lazy(()=>import('@/components/finance/FinanceJournals')),
 journals:lazy(()=>import('@/components/finance/FinanceJournals')),
 legacy:lazy(()=>import('@/components/finance/FinanceJournals')),
 statements:lazy(()=>import('@/components/finance/FinanceStatements')),
 customers:lazy(()=>import('@/components/finance/customers/CustomerAccounts')),
 suppliers:lazy(()=>import('@/components/finance/suppliers/SupplierAccounts')),
 planning:lazy(()=>import('@/components/finance/FinancePlanning')),
 integrity:lazy(()=>import('@/components/finance/FinanceIntegrityReport')),
 health:lazy(()=>import('@/components/finance/health/FinanceHealthCheck')),
 transaction_audit:lazy(()=>import('@/components/finance/transactions/TransactionAudit')),
 automatic:lazy(()=>import('@/components/finance/FinanceAutomaticPosting')),
 opening:lazy(()=>import('@/components/finance/opening/OpeningBalances')),
 mapping:lazy(()=>import('@/components/finance/mapping/MappingAccounts')),
 controls:lazy(()=>import('@/components/finance/FinanceControls')),
 audit:lazy(()=>import('@/components/finance/audit/FinanceAudit')),
 manual:lazy(()=>import('@/components/finance/manual/FinanceManual')),
};
export default function FinanceWorkspaceTabs({company,can,branches,branchQuery,filters,onFiltersChange,onCreateCompany,companies,onSelectCompany}) {
 const query=useQuery({queryKey:['finance','features',company.id],queryFn:()=>financeCall({action:'features',company_id:company.id}),staleTime:60000});
 // Sections closed in Admin › Modules are left out.
 const {isOpen}=useScreenTabs('Finance'),allFeatures=financeWorkspaceFeatures(query.data?.items||[]);
 const nav=useFinanceWorkspaceNavigation(allFeatures.filter(f=>isOpen(f.id)));
 if(query.isPending)return <p role="status" className="text-sm">Loading Finance sections…</p>;
 if(query.error)return <div role="alert" className="text-sm text-destructive">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></div>;
 if(!nav.section)return allFeatures.length?<ClosedTabsNotice/>:<p className="text-sm text-muted-foreground">No Finance sections are available for this account.</p>;
 const tab=nav.section.id,View=views[tab],configuration=['configuration','legal_company'].includes(nav.group.id);
 if(!View)throw new Error(`Finance section ${nav.section.title} has no connected screen.`);
 const key=tab==='transaction_audit'?`${company.id}:${JSON.stringify(filters)}`:tab==='planning'?`${company.id}:${filters.branch_id}:${filters.to}`:tab==='integrity'?`${company.id}:${JSON.stringify(filters)}`:tab==='automatic'?company.id:tab;
 return <Tabs value={nav.group.id} onValueChange={nav.selectGroup} className="space-y-5"><TabsList aria-label="Finance workspace views" className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1">{nav.groups.map(g=><TabsTrigger key={g.id} value={g.id} className="py-3 whitespace-normal">{g.title}</TabsTrigger>)}</TabsList>
 <TabsContent value={nav.group.id} className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{nav.group.title}</h2><p className="text-sm text-muted-foreground mt-1">{nav.group.description}</p></div></div>
 <Tabs value={tab} onValueChange={nav.selectSection} className="space-y-5"><div className="overflow-x-auto"><TabsList aria-label={`${nav.group.title} sections`} className="w-max">{nav.sections.map(s=><TabsTrigger key={s.id} value={s.id}>{s.title}</TabsTrigger>)}</TabsList></div>
 {!configuration&&<FinanceWorkspaceFilters branches={branchQuery} filters={filters} onChange={onFiltersChange}/>}
 {!configuration&&!['dashboard','comparison','health','transaction_audit','customers','suppliers'].includes(tab)&&<FinanceSummary company={company} filters={filters}/>}
 <TabsContent value={tab}><Suspense fallback={<p role="status" className="text-sm py-4">Loading selected Finance section…</p>}><View key={key} company={company} can={can} companies={companies} onSelectCompany={onSelectCompany} onCreateCompany={onCreateCompany} branches={branches} filters={filters} onFiltersChange={onFiltersChange} view={tab} mode={tab==='tax_rules'?'configuration':tab==='tax_system'?'reporting':'all'} showConfiguration={false}/></Suspense></TabsContent>
 </Tabs></TabsContent></Tabs>;
}