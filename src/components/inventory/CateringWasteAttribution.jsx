import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';

export default function CateringWasteAttribution({ branchId, form, onChange }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['waste-catering-events', branchId],
    queryFn: async () => {
      const rows = [];
      for (let skip = 0; ; skip += 200) {
        const page = await base44.entities.CateringEvent.filter(branchId ? { branch_id: branchId } : {}, '-event_date', 200, skip);
        rows.push(...page); if (page.length < 200) return rows;
      }
    },
  });
  return <div className="space-y-2">
    <Label>Catering event (optional)</Label>
    <select className="w-full border rounded-md bg-background p-2 text-sm" value={form.event_id || ''} disabled={isLoading} onChange={e => { const event = events.find(row => row.id === e.target.value); onChange({ ...form, event_id: e.target.value, catering_cost_treatment: '', branch_id: event?.branch_id, branch_name: event?.branch_name }); }}>
      <option value="">{isLoading ? 'Loading events…' : 'General branch waste — not an event'}</option>
      {events.filter(e => e.status !== 'cancelled').map(e => <option key={e.id} value={e.id}>{e.event_name} · {e.event_date}</option>)}
    </select>
    {form.event_id && <><Label>Was this stock already on a fulfilled release slip? *</Label><select className="w-full border rounded-md bg-background p-2 text-sm" value={form.catering_cost_treatment || ''} onChange={e => onChange({ ...form, catering_cost_treatment: e.target.value })}>
      <option value="">Choose cost treatment</option><option value="additional">No — additional discarded stock (increases cost)</option><option value="included_in_release">Yes — already counted in released cost</option>
    </select><p className="text-xs text-muted-foreground">This attribution does not move stock. Do not count the same discarded stock twice.</p></>}
  </div>;
}