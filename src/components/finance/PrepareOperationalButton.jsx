import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { financeCall, financeError } from '@/components/finance/financeApi';

// Prepares review journals for payroll, advances, cash expenses and catering returns
// that are final but not yet proposed. Nothing posts until Finance approves.
export default function PrepareOperationalButton({ company }) {
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: () => financeCall({ action: 'prepare_operational', company_id: company.id }),
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast.success(`${r.prepared} journal(s) prepared for review${r.issues ? ` · ${r.issues} need correction (see Posting issues)` : ''}.`);
    },
    onError: (e) => toast.error(financeError(e)),
  });
  return (
    <Button variant="outline" onClick={() => run.mutate()} disabled={run.isPending} className="gap-2">
      {run.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      Prepare from payroll, expenses & returns
    </Button>
  );
}