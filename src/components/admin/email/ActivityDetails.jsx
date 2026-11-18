import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { asDate } from "./activityFormat";

const SHOWN = 20;

export default function ActivityDetails({ log }) {
  const [all, setAll] = useState(false);
  const failedBy = new Map((log.failures || []).map((f) => [f.email, f.error]));
  const recipients = log.recipients || [];
  const shown = all ? recipients : recipients.slice(0, SHOWN);
  return (
    <div className="ml-7 mt-3 space-y-2 rounded-md border bg-slate-50 p-3 text-xs text-slate-700">
      <p><span className="text-slate-400">Subject: </span>{log.subject || "—"}</p>
      <p><span className="text-slate-400">Sent at: </span>{format(asDate(log.created_date), "d MMM yyyy, HH:mm")}</p>
      {log.triggered_by && <p><span className="text-slate-400">Sent by: </span>{log.triggered_by}</p>}
      {recipients.length ? (
        <ul className="space-y-1">
          {shown.map((email) => (
            <li key={email} className="flex items-start gap-1.5">
              {failedBy.has(email)
                ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              <span className="break-all">{email}{failedBy.has(email) && <span className="text-red-600">: {failedBy.get(email)}</span>}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-slate-500">No one was set to receive it, so nothing was sent.</p>}
      {recipients.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="font-medium text-slate-600 hover:text-slate-900">
          {all ? "Show less" : `Show all ${recipients.length}`}
        </button>
      )}
    </div>
  );
}