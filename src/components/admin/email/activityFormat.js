import { formatDistanceToNow } from "date-fns";

// Stored times are UTC; some come back without the trailing Z.
export const asDate = (ts) => new Date(ts && !ts.endsWith("Z") && !ts.includes("+") ? `${ts}Z` : ts);
export const timeAgo = (ts) => `${formatDistanceToNow(asDate(ts))} ago`;

export const SEND_STATUS = {
  sent: { label: "Sent", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  partial: { label: "Some failed", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  no_recipients: { label: "No one to send to", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
};