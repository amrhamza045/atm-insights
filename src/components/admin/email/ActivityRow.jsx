import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EMAIL_LABEL_BY_KEY } from "./emailCatalog";
import { SEND_STATUS, timeAgo } from "./activityFormat";
import ActivityDetails from "./ActivityDetails";

export default function ActivityRow({ log }) {
  const [open, setOpen] = useState(false);
  const status = SEND_STATUS[log.status] || SEND_STATUS.sent;
  return (
    <div className="px-4 py-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 text-left">
        <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{EMAIL_LABEL_BY_KEY[log.email_key] || log.email_key}</span>
            <Badge className={status.className}>{status.label}</Badge>
            {log.is_test && <Badge variant="outline">Test</Badge>}
          </div>
          <p className="truncate text-xs text-slate-500">{log.context || log.subject}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-500">
          <p>{timeAgo(log.created_date)}</p>
          <p>{log.sent_count} of {log.recipient_count} sent</p>
        </div>
      </button>
      {open && <ActivityDetails log={log} />}
    </div>
  );
}