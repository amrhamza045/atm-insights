import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
export default function TransactionRoutingSettings({data,onChange,disabled}){
 return <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-3"><legend className="font-medium text-sm mb-3">Rule settings</legend>
 <label className="text-sm">Effective from<Input required type="date" value={data.effective_from} onChange={e=>onChange({effective_from:e.target.value})}/></label>
 <label className="text-sm">Effective to (blank = no end)<Input type="date" min={data.effective_from} value={data.effective_to} onChange={e=>onChange({effective_to:e.target.value})}/></label>
 <label className="text-sm">Priority (higher wins)<Input required type="number" min="0" max="1000" step="1" value={data.priority} onChange={e=>onChange({priority:e.target.value===''?'':Number(e.target.value)})}/></label>
 <label className="text-sm sm:col-span-2">Rule notes<Textarea maxLength={1000} value={data.notes} onChange={e=>onChange({notes:e.target.value})}/></label>
 </fieldset>;
}