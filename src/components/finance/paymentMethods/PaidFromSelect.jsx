import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// "Paid from": the active payment methods of the branch's company. Their cash and bank
// accounts are set only in Finance › Mapping Accounts › Payment methods. Starts on the default.
export default function PaidFromSelect({ branchId, value, onChange, disabled = false }) {
  const query = useQuery({
    queryKey: ['payment-method-choices', branchId],
    enabled: !!branchId,
    staleTime: 60_000,
    queryFn: async () => (await base44.functions.invoke('paymentMethodChoices', { branch_id: branchId })).data.items,
  });
  const methods = query.data || [];
  const fallback = methods.find((m) => m.is_default);
  useEffect(() => { if (!value && fallback) onChange(fallback); }, [value, fallback?.code]);
  const error = query.error?.response?.data?.error || query.error?.message;
  return (
    <label className="block space-y-1 text-sm">
      <span>Paid from</span>
      <select aria-label="Paid from" className="w-full rounded-md border border-input bg-background p-2 text-sm" disabled={disabled || !branchId || query.isPending || !!error} value={value || ''} onChange={(e) => onChange(methods.find((m) => m.code === e.target.value) || null)}>
        <option value="">Select a payment method</option>
        {methods.map((m) => <option key={m.code} value={m.code}>{m.name}{m.is_default ? ' (default)' : ''}</option>)}
      </select>
      {!branchId ? <span className="block text-xs text-muted-foreground">Choose the employee first.</span>
        : query.isPending ? <span role="status" className="block text-xs text-muted-foreground">Loading payment methods…</span>
        : error ? <span role="alert" className="block text-xs text-destructive">{error}</span>
        : !methods.length ? <span className="block text-xs text-muted-foreground">No active payment methods. Add them in Finance › Mapping Accounts › Payment methods.</span>
        : null}
    </label>
  );
}