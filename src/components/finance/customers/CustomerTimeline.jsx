import { money } from "./customerAccountsApi";

// One event's dated entries (quotation, payments, refunds, cancellation) with a running balance.
export default function CustomerTimeline({ event, currency }) {
  let running = 0;
  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-slate-50 px-3 py-2">
        <div>
          <p className="font-medium text-slate-900" dir="auto">{event.event_name} {event.event_code && <span className="text-xs text-slate-400">#{event.event_code}</span>}</p>
          <p className="text-xs text-slate-500">{[event.event_date && `Event ${event.event_date}`, event.event_status, event.branch_name].filter(Boolean).join(" · ")}</p>
        </div>
        <p className="text-sm tabular-nums">Remaining <span className="font-semibold">{money(event.balance, currency)}</span></p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {event.entries.map((x, i) => {
            running += x.debit - x.credit;
            return (
              <tr key={i} className="border-t first:border-t-0">
                <td className="w-28 px-3 py-2 text-xs text-slate-500">{x.date || "—"}</td>
                <td className="px-3 py-2">{x.label}{x.reference && <span className="block text-xs text-slate-400">Ref. {x.reference}{x.method && ` · ${x.method}`}</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums">{x.debit ? money(x.debit) : ""}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${x.credit < 0 ? "text-red-600" : "text-emerald-700"}`}>{x.credit ? money(x.credit) : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{money(running)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}