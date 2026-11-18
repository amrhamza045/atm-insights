import { History } from "lucide-react";
import { timeAgo } from "./activityFormat";

// Last send and 30-day totals; opens Recent activity filtered to this email.
export default function LastSent({ stats, onShow }) {
  return (
    <button type="button" onClick={onShow} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
      <History className="h-3.5 w-3.5" />
      {stats ? (
        <>
          Last sent {timeAgo(stats.last)} · {stats.sent} in 30 days
          {stats.failed > 0 && <span className="font-medium text-red-600">· {stats.failed} failed</span>}
        </>
      ) : "Not sent in the last 30 days"}
    </button>
  );
}