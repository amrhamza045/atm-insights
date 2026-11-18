import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { financeAmount } from '@/components/finance/financeApi';
import OpeningAdvanceForm from '@/components/finance/opening/OpeningAdvanceForm';

const label = (a) => (a ? `${a.account_code} · ${a.account_name}` : null);

// B02: deposits clients paid before the cut-off for events after it, once per event.
export default function OpeningAdvancesCard({ company, data, canPost }) {
  const [open, setOpen] = useState(null);
  const advance = data.accounts?.advance, equity = data.equity[0];
  const entered = new Map(data.entries.filter((e) => e.kind === 'customer_advance').map((e) => [e.event_id, e]));
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <h4 className="font-semibold">Customer advances</h4>
        <p className="text-xs text-muted-foreground">Deposits clients paid before the cut-off{data.cutoff ? ` (${data.cutoff})` : ''} for events after it. Each posts once to {label(advance) || 'customer advances'} against {label(equity) || 'opening balance equity'} and counts as paid on the event, so its balance due and final invoice include it. No cash moves: that money is already in your opening cash and bank.</p>
      </div>
      {!advance && <p className="text-sm text-destructive">Map Customer advances in Mapping Accounts first.</p>}
      {!data.events.length ? <p className="text-sm text-muted-foreground">No open events {data.cutoff ? 'after the cut-off' : 'yet'}.</p> : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{['Client', 'Event', 'Date', 'Event total', 'Paid on event', 'Opening advance', ''].map((h) => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {data.events.map((ev) => {
                const e = entered.get(ev.id);
                return (
                  <Fragment key={ev.id}>
                    <tr className="border-t">
                      <td className="p-3">{ev.client_name || '—'}</td>
                      <td className="p-3">{ev.event_name}</td>
                      <td className="p-3">{ev.event_date}</td>
                      <td className="p-3 tabular-nums">{financeAmount(ev.quote_total, company)}</td>
                      <td className="p-3 tabular-nums">{financeAmount(ev.total_paid, company)}</td>
                      <td className="p-3">{e ? <Badge variant={e.status === 'posted' ? 'default' : 'secondary'}>{financeAmount(e.amount, company)} · {e.status === 'posted' ? 'Posted' : 'Pending'}</Badge> : <span className="text-muted-foreground">None</span>}</td>
                      <td className="p-3 text-right">{canPost && e?.status !== 'posted' && <Button size="sm" variant="outline" onClick={() => setOpen(open === ev.id ? null : ev.id)}>{e ? 'Finish' : 'Enter advance'}</Button>}</td>
                    </tr>
                    {open === ev.id && <tr><td colSpan={7} className="p-3 bg-muted/40"><OpeningAdvanceForm company={company} data={data} event={ev} pending={e} onDone={() => setOpen(null)} /></td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}