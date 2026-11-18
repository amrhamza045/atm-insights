import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export default function SupplierReturnFields({items, value, onChange, disabled}) {
 const set=(key,content)=>onChange({...value,[key]:content});
 return <fieldset disabled={disabled} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">
  <div><Label htmlFor="supplier-return-date">Return accounting date</Label><Input id="supplier-return-date" type="date" required value={value.entry_date} onChange={e=>set('entry_date',e.target.value)}/></div>
  <div><Label htmlFor="supplier-return-note">Supplier credit-note reference / reason</Label><Input id="supplier-return-note" required minLength={5} maxLength={1000} value={value.notes} onChange={e=>set('notes',e.target.value)}/></div></div>
  <p className="text-sm text-muted-foreground">Enter quantities in the original invoice units. Leave other lines blank.</p>
  {items.map(line=><div key={line.line_index} className="rounded-md border p-3 grid gap-2 sm:grid-cols-2"><div><Label htmlFor={`supplier-return-${line.line_index}`}>{line.inventory_item_name}</Label><p className="text-xs text-muted-foreground">Received {line.quantity} {line.unit} · Remaining to return {line.remaining_quantity} {line.unit}</p></div>
   <Input id={`supplier-return-${line.line_index}`} type="number" min="0" max={line.remaining_quantity} step="0.0001" disabled={line.remaining_quantity<=0} placeholder="Quantity to return" value={value.quantities[line.line_index]??''} onChange={e=>set('quantities',{...value.quantities,[line.line_index]:e.target.value})}/></div>)}
 </fieldset>;
}