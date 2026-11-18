import { useQuery } from "@tanstack/react-query";
import AccountDetailOverlay from "@/components/finance/AccountDetailOverlay";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { customerCall, money } from "./customerAccountsApi";
import CustomerTotals from "./CustomerTotals";
import CustomerTimeline from "./CustomerTimeline";

// A customer's details, upcoming balances due and full account timeline.
export default function CustomerDetailSheet({ client, company, filters, onClose, onExport, exporting }) {
  const query = useQuery({
    queryKey: ["customerAccount", company.id, client?.client_id, filters],
    queryFn: () => customerCall("detail", company, filters, { client_id: client.client_id }),
    enabled: !!client,
  });
  const a = query.data?.account, currency = query.data?.currency;
  return (
    <AccountDetailOverlay open={!!client} title={client?.client_name} onClose={onClose}>
        {query.isPending && <p className="py-8 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading account…</p>}
        {query.error && <p role="alert" className="py-6 text-sm text-red-600">{query.error.message}</p>}
        {a && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>{[a.client_phone, a.client_email].filter(Boolean).join(" · ") || "No contact details"}</span>
              <Button size="sm" variant="outline" disabled={exporting} onClick={() => onExport([a.client_id])}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Export PDF
              </Button>
            </div>
            <CustomerTotals totals={a} count={1} currency={currency} />
            {a.upcoming.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="mb-2 font-medium text-amber-900">Upcoming / due balances</p>
                {a.upcoming.map((u) => (
                  <p key={u.event_id} className="flex justify-between gap-2"><span dir="auto">{u.event_name} — due by {u.due_date || "event date"}{u.overdue && <span className="ml-1 text-red-600">(overdue)</span>}</span><span className="tabular-nums">{money(u.amount, currency)}</span></p>
                ))}
              </div>
            )}
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Columns: date · entry · debit · credit · running balance</p>
              {a.events.map((e) => <CustomerTimeline key={e.event_id} event={e} currency={currency} />)}
            </div>
          </div>
        )}
    </AccountDetailOverlay>
  );
}