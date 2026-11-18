import { Badge } from '@/components/ui/badge';
import { financeAmount } from '@/components/finance/financeApi';

const KIND = { cash: 'Cash and bank', inventory: 'Stock', customer_advance: 'Customer advance', fixed_asset: 'Fixed asset' };

function detail(e, company) {
  if (e.kind === 'customer_advance') return `${e.client_name || 'Client'} · ${e.event_name || ''}${e.event_date ? ` (${e.event_date})` : ''}`;
  if (e.kind === 'inventory') return `${e.inventory_item_name} · ${e.quantity} ${e.unit || ''}`;
  if (e.kind === 'fixed_asset') return `${e.asset_name} · ${e.asset_account_code}${e.accumulated_depreciation ? ` · less ${financeAmount(e.accumulated_depreciation, company)} depreciation` : ''}`;
  return e.payment_method_name || e.event_name || '—';
}

export default function OpeningEntriesTable({ company, entries }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No opening balances posted yet.</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted"><tr>{['Type', 'Branch', 'Detail', 'Amount', 'Status', 'Evidence'].map((h) => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-3">{KIND[e.kind] || e.kind}</td>
              <td className="p-3">{e.branch_name || e.branch_id}</td>
              <td className="p-3">{detail(e, company)}</td>
              <td className="p-3 tabular-nums">{financeAmount(e.amount, company)}</td>
              <td className="p-3"><Badge variant={e.status === 'posted' ? 'default' : 'secondary'}>{e.status === 'posted' ? 'Posted' : 'Pending: post again to finish'}</Badge></td>
              <td className="p-3 text-muted-foreground">{e.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}