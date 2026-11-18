import { useState } from 'react';
import RoutingConditionPicker from '@/components/finance/transactions/RoutingConditionPicker';
const choices={branch_id:'Branch',currency:'Currency',customer_id:'Customer',event_id:'Event',payment_method:'Payment method',payment_type:'Payment type',bank_cash_id:'Bank / cash account',category:'Category',warehouse:'Warehouse / storage location',event_type_id:'Event type',service_type_id:'Service type',tax_profile:'Tax profile',return_reason_code:'Return reason',original_tx_id:'Original transaction'};
export default function BindingConditions({fields,value,onChange,disabled=false,companyId,mappingKey}){
 const [labels,setLabels]=useState({});
 const change=(key,nextValue,label)=>{
  const next={...value};if(nextValue)next[key]=nextValue;else delete next[key];
  if(key==='branch_id'){delete next.customer_id;delete next.event_id;}
  if(key==='customer_id')delete next.event_id;
  setLabels(current=>({...current,[key]:label}));onChange(next);
 };
 return <fieldset className="border rounded-lg p-3"><legend className="text-sm font-semibold">Document context (blank = any)</legend><p className="text-xs text-muted-foreground mb-3">Select conditions from the dropdowns; blank means any. All selected conditions must match. Choices use company records and supported payment values; return reasons and original transaction references use existing configured routing values.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{fields.map(key=><RoutingConditionPicker key={key} companyId={companyId} field={key} label={choices[key]||key.replaceAll('_',' ')} value={value[key]} currentLabel={labels[key]} conditions={value} mappingKey={mappingKey} optionsAction="mapping_condition_options" disabled={disabled} onChange={(v,label)=>change(key,v,label)}/>)}</div></fieldset>;
}