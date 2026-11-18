import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeCall, financeError } from '@/components/finance/financeApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus } from 'lucide-react';
import { toast } from 'sonner';
import CustodyActionDialog from '@/components/finance/custody/CustodyActionDialog';

export default function CustodyManager({ company, can }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);

  const { data, isPending, error } = useQuery({
    queryKey: ['finance', 'custodies', company.id],
    queryFn: () => financeCall({ action: 'custodies', company_id: company.id }),
  });

  const mutate = useMutation({
    mutationFn: (payload) => financeCall({ action: payload.action, company_id: company.id, ...payload.data }),
    onSuccess: () => {
      toast.success('Staff custody updated');
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['hrPayouts'] });
      setDialog(null);
    },
    onError: (e) => toast.error(financeError(e)),
  });

  if (isPending) return <p className="text-sm p-4">Loading custodies…</p>;
  if (error) return <p className="text-sm text-destructive p-4">{financeError(error)}</p>;

  const { custodies = [], employees = [], payment_methods = [], mapped } = data;
  const active = custodies.filter((c) => c.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="w-5 h-5" /> Staff Custody Accounts</h2>
          <p className="text-sm text-muted-foreground mt-1">Detailed per-person balances reporting to the unified CUSTODY_CONTROL_ACC ledger summary account. One active custody per person.</p>
        </div>
        {can('finance_accounts_manage') && (
          <Button onClick={() => setDialog({ type: 'fund' })} className="gap-2"><Plus className="w-4 h-4" /> Open / Fund custody</Button>
        )}
      </div>

      {!mapped && (
        <div className="border rounded-lg p-4 bg-muted text-sm">
          <strong>CUSTODY_CONTROL_ACC is not mapped yet.</strong> Map <code>CUSTODY_CONTROL_ACC</code> to your unified Custody GL summary account in <em>Seven-section blueprint › Dynamic mapping engine</em> before funding or disbursing from custody.
        </div>
      )}

      {active.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold truncate">{c.employee_name}</p>
                  <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded">Active</span>
                </div>
                <div className="bg-muted p-3 rounded-md text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
                  <p className="text-2xl font-bold my-1">{c.currency} {Number(c.balance || 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Funded: {Number(c.total_funded || 0).toFixed(2)}</span>
                  <span>Disbursed: {Number(c.total_spent || 0).toFixed(2)}</span>
                </div>
                {can('finance_accounts_manage') && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setDialog({ type: 'fund', custody: c })}>Replenish</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setDialog({ type: 'return', custody: c })}>Return / Close</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground border p-8 text-center rounded-lg bg-muted/40">No active staff custodies.</p>
      )}

      {dialog && (
        <CustodyActionDialog
          dialog={dialog}
          employees={employees}
          activeIds={active.map((c) => c.employee_id)}
          paymentMethods={payment_methods}
          onClose={() => setDialog(null)}
          onSubmit={(payload) => mutate.mutate(payload)}
          busy={mutate.isPending}
        />
      )}
    </div>
  );
}