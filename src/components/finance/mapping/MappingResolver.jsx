import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import MappingFixture from '@/components/finance/mapping/MappingFixture';
import MappingPreview from '@/components/finance/mapping/MappingPreview';
export default function MappingResolver({company,can,catalogue}){
 const [id,setId]=useState(catalogue.events[0].id),[sample,setSample]=useState({date:new Date().toISOString().slice(0,10),amounts:Object.fromEntries(catalogue.bases.map(b=>[b,'0'])),dimensions:{branch_id:company.branch_ids[0]||'',currency:company.currency}});
 const mutation=useMutation({mutationFn:()=>financeCall({action:'mapping_resolve',company_id:company.id,event_type:id,sample})});const event=catalogue.events.find(e=>e.id===id);
 const data={...event,required_dimensions:catalogue.dimension_fields,conditions:{category:'',tax_profile:'',payment_method:''},lines:catalogue.bases.map(b=>({basis:b}))};
 return <div className="space-y-4"><p className="text-sm text-muted-foreground">Test which approved dated rule wins. No match, equal winning priority, missing dimensions or imbalance blocks the preview. All amounts are sample inputs, not operational records.</p><label className="text-sm block">Financial event<select className="border rounded-md bg-background p-2 block w-full" value={id} onChange={e=>{setId(e.target.value);mutation.reset();}}>{catalogue.events.map(e=><option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}</select></label><MappingFixture data={data} sample={sample} onChange={s=>{setSample(s);mutation.reset();}}/><Button disabled={mutation.isPending||!(can('finance_accounts_manage')||can('finance_journal_approve'))} onClick={()=>mutation.mutate()}>{mutation.isPending?'Resolving…':'Resolve approved mapping & simulate'}</Button>{mutation.error&&<p role="alert" className="text-sm text-destructive">{financeError(mutation.error)}</p>}<MappingPreview company={company} result={mutation.data}/></div>;
}