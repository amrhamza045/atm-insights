import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import MappingFields from '@/components/finance/mapping/MappingFields';
import MappingLines from '@/components/finance/mapping/MappingLines';
import MappingFixture from '@/components/finance/mapping/MappingFixture';
import MappingPreview from '@/components/finance/mapping/MappingPreview';
import MappingActions from '@/components/finance/mapping/MappingActions';
import MappingPolicyChecks from '@/components/finance/mapping/MappingPolicyChecks';
import MappingPolicyFields from '@/components/finance/mapping/MappingPolicyFields';
import MappingDeleteDraft from '@/components/finance/mapping/MappingDeleteDraft';
export default function MappingEditor({company,can,catalogue,rule,onSaved,onClose}){
 const event=catalogue.events.find(e=>e.id===rule.event_type),today=new Date().toISOString().slice(0,10);
 const [data,setData]=useState(()=>({...event,name:event.name,event_type:event.id,description:event.note||'',policy_reference:event.policy_reference||'',effective_from:today,effective_to:'',priority:100,conditions:{},...rule,lines:rule.lines||event.lines}));
 const [sample,setSample]=useState(()=>rule.fixture||{date:today,amounts:Object.fromEntries(catalogue.bases.map(b=>[b,['tax','withholding','commission','payroll_component','service','delivery','depreciation'].includes(b)?'0':'100'])),dimensions:{branch_id:company.branch_ids[0]||'',currency:company.currency}}),[requestId]=useState(()=>crypto.randomUUID()),qc=useQueryClient();
 const editable=can('finance_accounts_manage')&&(!rule.id||rule.status==='draft');
 const simulation=useMutation({mutationFn:()=>financeCall({action:'mapping_simulate',company_id:company.id,...(editable?{definition:data}:{id:rule.id}),sample})});
 const save=useMutation({mutationFn:()=>financeCall({action:'mapping_save',company_id:company.id,id:rule.id,expected_updated_date:rule.updated_date,request_id:requestId,data,sample}),onSuccess:r=>{onSaved(r.rule);qc.invalidateQueries({queryKey:['finance']});}});
 const change=value=>{setData(value);simulation.reset();};const changeSample=value=>{setSample(value);simulation.reset();};
 return <div className="space-y-5"><div className="flex flex-wrap gap-3 items-center"><Button type="button" variant="outline" onClick={onClose}>Back to rules</Button><h3 className="font-semibold">{event.id} · {event.name}</h3></div><p className="text-sm text-muted-foreground">Source: {event.source_entity} · Adapter not connected. Templates are recommended, not approved accounting policy.</p>
 <MappingFields company={company} catalogue={catalogue} data={data} onChange={change} disabled={!editable}/><MappingPolicyFields event={event} data={data} onChange={change} disabled={!editable}/><MappingLines company={company} catalogue={catalogue} lines={data.lines} onChange={lines=>change({...data,lines})} disabled={!editable}/><MappingFixture data={data} sample={sample} onChange={changeSample} disabled={!editable&&!(can('finance_accounts_manage')||can('finance_journal_approve'))}/>
 <div className="flex flex-wrap gap-2">{(can('finance_accounts_manage')||can('finance_journal_approve'))&&<Button type="button" variant="outline" disabled={simulation.isPending||save.isPending} onClick={()=>simulation.mutate()}>{simulation.isPending?'Simulating…':'Simulate journal'}</Button>}{editable&&<Button type="button" disabled={save.isPending||simulation.isPending} onClick={()=>save.mutate()}>{save.isPending?'Saving…':'Validate and save draft'}</Button>}</div>{[simulation.error,save.error].filter(Boolean).map((e,i)=><p key={i} role="alert" className="text-sm text-destructive">{financeError(e)}</p>)}<MappingPreview result={simulation.data} company={company}/>{rule.id&&<><MappingPolicyChecks company={company} rule={rule} can={can}/><MappingActions company={company} rule={rule} can={can} onSaved={onSaved}/><MappingDeleteDraft company={company} rule={rule} can={can} onDeleted={onClose}/></>}</div>;
}