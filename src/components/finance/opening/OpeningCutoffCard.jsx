import { CalendarCheck, Scale } from 'lucide-react';

export default function OpeningCutoffCard({ data }) {
  const equity = data.equity[0];
  const dateNote = !equity ? '' : equity.effective_from === data.cutoff ? ' · matches the cut-off' : !data.cutoff ? ' · moves to the cut-off when the first opening balance posts' : '';
  return (
    <div className="rounded-lg border p-4 grid gap-4 sm:grid-cols-2 text-sm">
      <div>
        <p className="font-medium flex items-center gap-2"><CalendarCheck className="w-4 h-4" />Cut-off date</p>
        <p className="mt-1 text-base">{data.cutoff || 'Not set yet'}</p>
        <p className="text-xs text-muted-foreground mt-1">{data.cutoff ? 'Fixed by the first opening balance. Every opening entry uses this date.' : 'You set it with the first opening balance; it is then fixed for the company.'}</p>
      </div>
      <div>
        <p className="font-medium flex items-center gap-2"><Scale className="w-4 h-4" />Opening balance equity</p>
        {equity ? (
          <>
            <p className="mt-1 text-base">{equity.account_code} · {equity.account_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Mapping starts {equity.effective_from}{dateNote}</p>
          </>
        ) : (
          <p className="mt-1 text-destructive">Not mapped yet. Map Opening balance equity in Mapping Accounts first.</p>
        )}
      </div>
    </div>
  );
}