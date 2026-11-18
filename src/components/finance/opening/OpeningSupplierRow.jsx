import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { financeAmount } from '@/components/finance/financeApi';
import SupplierOpeningForm from '@/components/purchasing/supplierAccounts/SupplierOpeningForm';

// One supplier: reported balance, the opening in its ledger, and the opening form in place.
export default function OpeningSupplierRow({ row, branchId, company, data, canPost }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const opening = row.openings.find((o) => o.branch_id === branchId), ledger = row.ledger[branchId];
  const close = () => { setOpen(false); qc.invalidateQueries({ queryKey: ['finance', 'openings'] }); };
  const resume = opening?.status === 'pending' ? { delta: opening.amount, entry_date: opening.entry_date, notes: opening.notes, account_snapshot: { offset_account_id: opening.offset_account_id, already_in_gl: opening.already_in_gl } } : undefined;
  return (
    <>
      <tr className="border-t align-top">
        <td className="p-3">{row.supplier_name}</td>
        <td className="p-3 tabular-nums">{row.reported ? financeAmount(row.reported, company) : '—'}</td>
        <td className="p-3">
          {!opening ? <span className="text-muted-foreground">Not entered</span> : (
            <span className="flex flex-wrap items-center gap-1 tabular-nums">
              {financeAmount(opening.amount, company)} · {opening.entry_date}
              <Badge variant={opening.status === 'posted' ? 'default' : 'secondary'}>{opening.status === 'posted' ? 'Posted' : 'Pending'}</Badge>
              {data.cutoff && opening.entry_date !== data.cutoff && <Badge variant="outline">Not the cut-off</Badge>}
            </span>
          )}
        </td>
        <td className="p-3 text-muted-foreground tabular-nums">{ledger ? `${financeAmount(ledger.invoiced, company)} from ${ledger.first}` : '—'}</td>
        <td className="p-3 text-right">
          {canPost && branchId && opening?.status !== 'posted' && <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>{opening ? 'Finish opening' : 'Enter opening'}</Button>}
        </td>
      </tr>
      {open && (
        <tr><td colSpan={5} className="p-3 bg-muted/40">
          <SupplierOpeningForm scope={{ branch_id: branchId, supplier_id: row.supplier_id }} resume={resume} defaults={{ amount: row.reported || '', entry_date: data.cutoff || '', offset_account_id: data.equity[0]?.account_id || '' }} onClose={close} />
        </td></tr>
      )}
    </>
  );
}