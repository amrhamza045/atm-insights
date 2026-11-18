import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SupplierAccountChoices from '@/components/purchasing/supplierAccounts/SupplierAccountChoices';
export default function SupplierPaymentFields({scope, value, onChange, disabled, max, fixedAmount, notesOptional = false}) {
  const set = (key, data) => onChange({...value, [key]: data});
  return <div className="grid gap-3 sm:grid-cols-2">
    <Label className="space-y-1">Amount paid (EGP)<Input type="number" min="0.01" max={max} step="0.01" required value={value.amount} disabled={disabled || fixedAmount} onChange={e => set('amount', e.target.value)} /></Label>
    <Label className="space-y-1">Payment date<Input type="date" required value={value.entry_date} disabled={disabled} onChange={e => set('entry_date', e.target.value)} /></Label>
    <div className="space-y-1 sm:col-span-2"><Label>Payment method</Label><SupplierAccountChoices scope={scope} value={value.payment_method} disabled={disabled} onChange={method => set('payment_method', method)} /></div>
    <Label className="space-y-1 sm:col-span-2">Payment reference / notes{notesOptional && ' (optional)'}<Input required={!notesOptional} minLength={notesOptional ? undefined : 5} maxLength={1000} value={value.notes} disabled={disabled} onChange={e => set('notes', e.target.value)} /></Label>
  </div>;
}