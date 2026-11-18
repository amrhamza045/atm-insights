import RoutingConditionPicker from '@/components/finance/transactions/RoutingConditionPicker';
const fields={payment_method:'Payment method',branch_id:'Branch',currency:'Currency',payment_type:'Payment type',customer_id:'Customer',event_id:'Event'};
export default function TransactionRoutingConditions({companyId,detail,mappingKey,data,onChange,disabled}){
 const change=(field,value,label)=>{
  const conditions={...data.conditions},labels={...data.labels};if(value){conditions[field]=value;labels[field]=label;}else{delete conditions[field];delete labels[field];}
  if(field==='branch_id'){delete conditions.customer_id;delete conditions.event_id;delete labels.customer_id;delete labels.event_id;}
  if(field==='customer_id'){delete conditions.event_id;delete labels.event_id;}
  onChange({conditions,labels});
 };
 return <fieldset className="space-y-3"><legend className="font-medium text-sm">Matching conditions</legend><p className="text-xs text-muted-foreground">Any means unrestricted for that condition. Choices come from the payment’s supported values and this company’s branches and events. All selected conditions must match.</p>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{(detail.routing.condition_fields||[]).map(field=><RoutingConditionPicker key={field} companyId={companyId} field={field} label={fields[field]} mappingKey={mappingKey} value={data.conditions[field]} currentLabel={data.labels[field]} conditions={data.conditions} disabled={disabled} onChange={(value,label)=>change(field,value,label)}/>)}</div>
 </fieldset>;
}