import { Input } from '@/components/ui/input';
export default function MappingPolicyFields({event,data,onChange,disabled}){
 if(!event.section)return null;
 const policy={...event.processing_policy,...data.processing_policy};
 const set=patch=>onChange({...data,processing_policy:{...policy,...patch}});
 return <fieldset className="border rounded-lg p-4 space-y-3"><legend className="text-sm font-semibold">Processing & valuation policy</legend>
 <p className="text-sm">Trigger: <strong>{event.trigger.replaceAll('_',' ')}</strong></p><p className="text-sm text-muted-foreground">{event.note}</p>
 <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Valuation basis<Input readOnly value={policy.valuation.replaceAll('_',' ')}/></label><label className="text-sm">Recognition timing<Input readOnly value={policy.recognition_timing.replaceAll('_',' ')}/></label>
 {event.section==='sales'&&<label className="text-sm">Required advance collection (%)<Input type="number" min="0" max="100" value={policy.collection_percent??''} disabled={disabled} onChange={e=>set({collection_percent:e.target.value===''?null:Number(e.target.value)})}/></label>}
 {event.id==='B08'&&<label className="text-sm">Allocate freight by<select className="block w-full rounded border p-2 bg-background" value={policy.landed_cost_allocation} disabled={disabled} onChange={e=>set({landed_cost_allocation:e.target.value})}>{['manual','quantity','value','weight'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}</div>
 <p className="text-xs text-muted-foreground">These policies are saved with the rule. Live collection, stock valuation and revenue timing are unchanged until the complete posting integration is activated after review.</p></fieldset>;
}