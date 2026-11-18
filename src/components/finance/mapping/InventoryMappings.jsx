import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import BindingRow from '@/components/finance/mapping/BindingRow';
import InventoryBindingForm from '@/components/finance/mapping/InventoryBindingForm';
import InventoryPolicyForm from '@/components/finance/mapping/InventoryPolicyForm';
const KEYS={INVENTORY_CONTROL_ACCOUNT:'Inventory control by category',INVENTORY_WIP_ACCOUNT:'Production WIP by output category',INVENTORY_COGS_ACCOUNT:'COGS by consumed category',TASTING_HOLDING_ACCOUNT:'Tastings holding by category'};
export default function InventoryMappings({company,can}) {
 const [key,setKey]=useState('INVENTORY_CONTROL_ACCOUNT'),[selected,setSelected]=useState(null);
 const q=useQuery({queryKey:['finance','inventory-configuration',company.id],queryFn:()=>financeCall({action:'inventory_configuration',company_id:company.id})});
 const list=useFinanceList({action:'mapping_bindings',company_id:company.id,mapping_key:key});
 if(q.isPending)return <p role="status">Loading inventory accounting…</p>;
 if(q.error)return <p role="alert">{financeError(q.error)} <Button variant="outline" onClick={()=>q.refetch()}>Retry</Button></p>;
 return <div className="space-y-5"><InventoryPolicyForm key={JSON.stringify(q.data.policy)} company={company} policy={q.data.policy} can={can}/><div className="flex flex-wrap items-center gap-3"><label className="text-sm">Account mappings<select className="block rounded-md border bg-background p-2" value={key} onChange={e=>setKey(e.target.value)}>{Object.entries(KEYS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{can('finance_accounts_manage')&&<Button variant="outline" onClick={()=>setSelected({mapping_key:key})}>Add category routing</Button>}</div>
 {selected&&<InventoryBindingForm key={selected.id||selected.mapping_key} company={company} binding={selected} onClose={()=>setSelected(null)}/>}
 <p className="text-sm text-muted-foreground">For every raw, semi-finished or finished category, select its own active GL asset account. Map WIP for production outputs and COGS for sold/delivered categories. Supplier payables continue through VENDOR_AP_ACCOUNT. Historical mappings cannot be overwritten or deleted; add a higher-priority dated routing for changes.</p>
 {list.items.map(binding=><BindingRow key={binding.id} binding={binding} company={company} can={can} onEdit={setSelected}/>)}<FinanceListState query={list}/>
 <p className="text-xs text-muted-foreground">Manage dated branch conditions and advanced routing in Seven-section blueprint → Dynamic mapping engine. Missing or ambiguous mappings appear in Exceptions and never fall back to a hard-coded GL account.</p></div>;
}