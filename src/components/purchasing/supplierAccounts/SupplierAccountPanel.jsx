import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useBranch } from '@/components/branches/BranchContext';
import { useHasAnyPermission } from '@/components/permissions/PermissionsContext';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import { supplierAccountCall, supplierError } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
import SupplierAccountInvoices from '@/components/purchasing/supplierAccounts/SupplierAccountInvoices';
import SupplierAccountHistory from '@/components/purchasing/supplierAccounts/SupplierAccountHistory';
import SupplierOpeningForm from '@/components/purchasing/supplierAccounts/SupplierOpeningForm';
import SupplierPaymentForm from '@/components/purchasing/supplierAccounts/SupplierPaymentForm';
import SupplierReviewForm from '@/components/purchasing/supplierAccounts/SupplierReviewForm';
import SupplierReturnForm from '@/components/purchasing/supplierAccounts/SupplierReturnForm';
export default function SupplierAccountPanel({supplierId}) {
  const {selectedBranchId, selectedBranch} = useBranch(), [action, setAction] = useState(null), [history, setHistory] = useState(false);
  const canRead = useHasAnyPermission(['purchase_view','purchase_edit','purchase_approve','financial_view','finance_edit']);
  const canWrite = useHasAnyPermission(['purchase_approve','finance_edit']), canOpen = useHasAnyPermission(['finance_journal_approve']);
  const scope = {supplier_id: supplierId, branch_id: selectedBranchId};
  const q = useQuery({queryKey: ['supplier-accounts', scope, 'summary'], enabled: !!supplierId && !!selectedBranchId && canRead, queryFn: () => supplierAccountCall({...scope, action: 'summary'})});
  useEffect(() => {setAction(null);}, [supplierId, selectedBranchId]);
  if (!canRead) return null;
  if (!selectedBranchId) return <p className="text-sm text-muted-foreground">Select a working branch to view supplier accounts.</p>;
  const s = q.data;
  return <section className="rounded-xl border bg-card p-4 space-y-4">
    <div className="flex flex-wrap justify-between items-start gap-3"><div><h3 className="text-lg font-semibold">Supplier account</h3><p className="text-sm text-muted-foreground">{s?.supplier_name} · {selectedBranch?.name} · {s?.company_name}</p></div><Button variant="outline" onClick={() => setHistory(!history)}>{history ? 'Invoices' : 'Account history'}</Button></div>
    {q.isPending && <p role="status">Loading supplier balance…</p>}{q.error && <p role="alert" className="text-destructive">{supplierError(q.error)} <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}
    {s && <><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted p-3"><p className="text-sm text-muted-foreground">{s.balance < 0 ? 'Verified supplier credit' : 'Verified balance owed'}</p><strong className="text-xl">{formatCurrency(Math.abs(s.balance))}</strong></div><div className="rounded-lg bg-muted p-3"><p className="text-sm text-muted-foreground">Invoices requiring review</p><strong className="text-xl">{s.review_count}</strong></div><div className="rounded-lg bg-muted p-3"><p className="text-sm text-muted-foreground">Opening balance cutoff</p><strong>{s.opening?.entry_date || 'Not entered'}</strong>{s.opening && <p className="text-xs">{s.covered_count} earlier invoices covered</p>}</div></div>
    <p className="text-xs text-muted-foreground">Legacy reported balance: {formatCurrency(s.legacy_reported_balance)} ({s.legacy_scope}). Review invoices or enter a verified opening balance; historical amounts are never assumed paid or unpaid.</p>
    {!!s.pending_count && <p role="alert" className="rounded-md border p-3 text-sm text-destructive">{s.pending_count} incomplete account operation(s). Open account history to resume the saved payment, return or opening, or resume the invoice review with the same amounts.</p>}
    {!action && <div className="flex flex-wrap gap-2">{canOpen && !s.opening && <Button variant="outline" onClick={() => setAction({kind: 'opening'})}>Enter opening balance</Button>}{canWrite && s.opening_outstanding > 0 && s.balance > 0 && <Button variant="outline" onClick={() => setAction({kind: 'pay'})}>Pay opening balance</Button>}</div>}
    {action?.kind === 'opening' && <SupplierOpeningForm scope={scope} resume={action.resume} onClose={() => setAction(null)} />}
    {action?.kind === 'pay' && <SupplierPaymentForm key={action.resume?.id || action.invoice?.id || 'opening'} scope={scope} invoice={action.invoice} balance={Math.min(s.balance, s.opening_outstanding)} resume={action.resume} onClose={() => setAction(null)} />}
    {action?.kind === 'review' && <SupplierReviewForm key={action.invoice.id} scope={scope} invoice={action.invoice} onClose={() => setAction(null)} />}
    {action?.kind === 'return' && <SupplierReturnForm key={action.resume?.id || action.invoice.id} scope={scope} invoice={action.invoice} resume={action.resume} onClose={() => setAction(null)} />}
    {history ? <SupplierAccountHistory scope={scope} canWrite={canWrite} canOpen={canOpen} onResume={entry => setAction({kind: entry.kind === 'opening' ? 'opening' : entry.kind === 'supplier_return' ? 'return' : 'pay', resume: entry})} /> : <SupplierAccountInvoices scope={scope} canWrite={canWrite} onAction={setAction} />}
    </>}
  </section>;
}