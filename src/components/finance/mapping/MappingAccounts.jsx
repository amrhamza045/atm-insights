import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import useScreenTabs from '@/hooks/useScreenTabs';
import ClosedTabsNotice from '@/components/modules/ClosedTabsNotice';
import FinancePostingIssues from '@/components/finance/FinancePostingIssues';
import MappingCoverage from '@/components/finance/mapping/MappingCoverage';
import MappingTemplates from '@/components/finance/mapping/MappingTemplates';
import MappingRules from '@/components/finance/mapping/MappingRules';
import MappingEditor from '@/components/finance/mapping/MappingEditor';
import MappingResolver from '@/components/finance/mapping/MappingResolver';
import MappingRecovery from '@/components/finance/mapping/MappingRecovery';
import BlueprintWorkspace from '@/components/finance/mapping/BlueprintWorkspace';
import PaymentMethods from '@/components/finance/paymentMethods/PaymentMethods';
import WasteReasons from '@/components/finance/wasteReasons/WasteReasons';
import { Link } from 'react-router-dom';
import InventoryMappings from '@/components/finance/mapping/InventoryMappings';
// Each tab can be closed in Admin › Modules, per role or per user.
const TABS={inventory:'Inventory lifecycle & COGS',payment_methods:'Payment methods',waste_reasons:'Waste reasons',blueprint:'Accounting blueprint',coverage:'Coverage',templates:'Templates',rules:'Rules & approval',simulation:'Simulation',recovery:'Event recovery',exceptions:'Exceptions',history:'Version history'};
export default function MappingAccounts({company,can}){
 const [tab,setTab]=useState('blueprint'),[selected,setSelected]=useState(null);
 const screenTabs=useScreenTabs('FinanceMapping'),shown=screenTabs.pick(tab,Object.keys(TABS));
 const query=useQuery({queryKey:['finance','mapping-catalogue',company.id],queryFn:()=>financeCall({action:'mapping_catalogue',company_id:company.id})});
 const open=value=>{setSelected(value);setTab('rules');};
 if(query.isPending)return <p role="status">Loading financial event catalogue…</p>;
 if(query.error)return <div role="alert">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></div>;
 const catalogue=query.data;
 return <section className="space-y-5"><div><h2 className="text-xl font-semibold">Mapping Accounts</h2><p className="text-sm text-muted-foreground">Define which debit and credit accounts each financial event will use. Company: {company.name} · {company.currency}.</p></div>
 <div className="border rounded-lg bg-muted p-4 text-sm space-y-1.5"><div><strong>Complete supported mappings activate automatically.</strong> Cash and bank accounts come only from Payment methods. Catering payments use CUSTOMER_ADVANCE_ACC and capture their accounts at submission. Missing or ambiguous mappings block the transaction and appear in Exceptions.</div><div className="text-xs text-muted-foreground">Petty Cash / Custody and Expenses live in their own standalone modules with dedicated configurations: <Link to="/PettyCashCustody" className="underline font-medium text-foreground">Petty Cash &amp; Custody</Link> and <Link to="/Expenses" className="underline font-medium text-foreground">Expenses</Link>.</div></div>
 {!shown?<ClosedTabsNotice/>:<Tabs value={shown} onValueChange={setTab}><div className="overflow-x-auto"><TabsList className="w-max">{Object.keys(TABS).filter(key=>screenTabs.isOpen(key)).map(t=><TabsTrigger value={t} key={t}>{TABS[t]}</TabsTrigger>)}</TabsList></div>
 <TabsContent value="inventory"><InventoryMappings key={company.id} company={company} can={can}/></TabsContent>
 <TabsContent value="payment_methods"><PaymentMethods key={company.id} company={company} can={can}/></TabsContent>
 <TabsContent value="waste_reasons"><WasteReasons key={company.id} company={company} can={can}/></TabsContent>
 <TabsContent value="blueprint"><BlueprintWorkspace key={company.id} company={company} can={can} catalogue={catalogue}/></TabsContent>
 <TabsContent value="coverage"><MappingCoverage catalogue={catalogue} onOpen={open}/></TabsContent>
 <TabsContent value="templates"><MappingTemplates catalogue={catalogue} onOpen={open}/></TabsContent>
 <TabsContent value="rules">{selected?<MappingEditor key={`${selected.id||selected.event_type}:${selected.updated_date||''}`} company={company} can={can} catalogue={catalogue} rule={selected} onSaved={setSelected} onClose={()=>setSelected(null)}/>:<MappingRules company={company} can={can} catalogue={catalogue} onOpen={open}/>}</TabsContent>
 <TabsContent value="simulation"><MappingResolver company={company} can={can} catalogue={catalogue}/></TabsContent>
 <TabsContent value="recovery"><MappingRecovery company={company} can={can}/></TabsContent>
 <TabsContent value="exceptions"><FinancePostingIssues company={company} can={can}/></TabsContent>
 <TabsContent value="history"><MappingRules company={company} can={can} catalogue={catalogue} onOpen={open} history/></TabsContent></Tabs>}</section>;
}