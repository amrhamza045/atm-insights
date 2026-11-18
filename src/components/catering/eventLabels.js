/** Badge colours of event statuses, shared by the Events tab and the all-events lists. */
export const EVENT_STATUS_STYLES = {
  enquiry: "bg-slate-100 text-slate-700",
  quoted: "bg-blue-100 text-blue-700",
  deposit_pending: "bg-warning-100 text-warning-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

/** A stored status as words ("in_progress" → "in progress"). */
export const statusWords = (value, empty = "none") => (value || empty).replace(/_/g, " ");