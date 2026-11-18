import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
export default function EquipmentDamageCostField({ damaged, value, onChange }) {
  if (!(Number(damaged) > 0)) return null;
  return <div><Label>Total repair cost for all damaged pieces (EGP) *</Label><Input type="number" min="0.01" step="0.01" value={value} onChange={e => onChange(e.target.value)} required /><p className="text-xs text-muted-foreground">Enter the whole repair amount, not a per-piece rate. Required before check-in.</p></div>;
}