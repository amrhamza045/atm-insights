import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { usePermissions, useIsAdmin } from '@/components/permissions/PermissionsContext';

export default function ActualCostsRecomputeButton({ event, finalized }) {
  const { permissions, currentUser } = usePermissions();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isAdmin = useIsAdmin();
  const allowed = isAdmin || permissions?.catering_approve || permissions?.catering_finance;
  if (!allowed || (!finalized && !['completed', 'cancelled'].includes(event?.status))) return null;
  const recompute = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await base44.functions.invoke('recomputeCateringActualCosts', { event_id: event.id });
      setMessage(data.result.status === 'skipped_cancelled' ? 'Cancelled event excluded.' : `Actual costs saved${data.result.warning_codes.length ? ` with ${data.result.warning_codes.length} data-quality flags` : ''}.`);
      await queryClient.invalidateQueries({ queryKey: ['catering-events'] });
    } catch (error) { setMessage(error.response?.data?.error || error.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-1"><Button size="sm" variant="outline" disabled={busy} onClick={recompute}>{busy ? 'Recomputing…' : 'Recompute actual costs'}</Button>{message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}</div>;
}