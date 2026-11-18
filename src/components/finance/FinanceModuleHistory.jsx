import { useState } from 'react';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import FinanceModuleReview from '@/components/finance/FinanceModuleReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { financeAmount } from '@/components/finance/financeApi';
export default function FinanceModuleHistory({company}) {
 const [entity,setEntity]=useState('Order'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[record,setRecord]=useState(null);
 const query=useFinanceList({action:'module_history',company_id:company.id,source_entity:entity,from,to});
 return <section className="border rounded-lg p-4 space-y-4"><h2 className="font-semibold">Reconcile transaction history</h2><p className="text-sm text-muted-foreground">No historical balances change during preview. Confirm original payment dates and evidence, then submit a proposal for an independent reviewer in Pending review. Linked legacy journals must be reconciled through Historical reconstruction instead. This scan is not a complete reconstruction of inventory, payroll or loyalty.</p><div className="flex flex-wrap items-end gap-3"><label className="text-sm">Source<select className="block border rounded-md p-2 bg-background" value={entity} onChange={e=>{setEntity(e.target.value);setRecord(null);}}><option value="Order">Sales orders</option><option value="PurchaseInvoice">Supplier invoices</option></select></label><label className="text-sm">Source created from<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-sm">Source created through<Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Source','Source status','Recorded amount','Action'].map(h=><th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{query.items.map(s=><tr key={s.id} className="border-t"><td className="p-2">{s.invoice_number||s.id}</td><td className="p-2">{s.status||'Legacy status missing'}</td><td className="p-2">{financeAmount(s.total??s.total_amount,company)}</td><td className="p-2"><Button variant="outline" onClick={()=>setRecord(s)}>Preview & reconcile</Button></td></tr>)}</tbody></table></div><FinanceListState query={query}/>
 {record&&<FinanceModuleReview company={company} entity={entity} record={record} onClose={()=>setRecord(null)}/>}
 </section>;
}