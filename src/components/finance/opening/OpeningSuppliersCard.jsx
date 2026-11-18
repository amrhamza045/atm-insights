import { useState } from 'react';
import { financeAmount } from '@/components/finance/financeApi';
import OpeningSupplierRow from '@/components/finance/opening/OpeningSupplierRow';

const SELECT = 'border rounded-md p-2 bg-background text-sm';

// B03: what the company owed each supplier at the cut-off. Entered here or from the
// supplier's account; either way it lands in that supplier's balance, posted once.
export default function OpeningSuppliersCard({ company, data, branches = [], canPost }) {
  const [picked, setPicked] = useState('');
  const branchId = picked || branches[0]?.id || '';
  const rows = data.suppliers || [], payable = data.accounts?.payable, equity = data.equity[0];
  const missing = rows.filter((r) => r.reported > 0 && !r.openings.some((o) => o.branch_id === branchId));
  const missingTotal = missing.reduce((t, r) => t + r.reported, 0);
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <h4 className="font-semibold">Supplier payables</h4>
        <p className="text-xs text-muted-foreground">What you owed each supplier at the cut-off{data.cutoff ? ` (${data.cutoff})` : ''}. It posts once to {payable ? `${payable.account_code} · ${payable.account_name}` : 'supplier payables (not mapped yet)'} against {equity ? `${equity.account_code} · ${equity.account_name}` : 'an equity account'} and shows in that supplier's balance in Supplier accounts. "Reported" is the balance kept on the supplier record from before the ledger: if that supplier's invoices are already in the system it may include them, so check it before posting.</p>
      </div>
      {branches.length > 1 && (
        <select aria-label="Branch" className={SELECT} value={branchId} onChange={(e) => setPicked(e.target.value)}>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      {missing.length > 0 && <p className="text-sm text-warning-700">{missing.length} supplier{missing.length === 1 ? ' has' : 's have'} a reported balance ({financeAmount(missingTotal, company)} {company.currency}) with no opening entered.</p>}
      {!rows.length ? <p className="text-sm text-muted-foreground">No active suppliers.</p> : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{['Supplier', 'Reported', 'Opening in ledger', 'Invoices already in the system', ''].map((h) => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <OpeningSupplierRow key={r.supplier_id} row={r} branchId={branchId} company={company} data={data} canPost={canPost} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}