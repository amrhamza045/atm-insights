import RoutingConditionPicker from '@/components/finance/transactions/RoutingConditionPicker';
export default function MappingKeyPicker({companyId,keys,value,onChange,disabled,label='Mapping key'}){
 return <RoutingConditionPicker companyId={companyId} field="mapping_key" label={label} value={value} onChange={onChange} disabled={disabled} conditions={{}} optionsAction="mapping_condition_options" extraOptions={(keys||[]).map(key=>({value:key,label:key}))} emptyLabel="Select a mapping key" required/>;
}