import { startOfDay, isBefore, isSameDay } from "date-fns";

/** overdue | today | upcoming — computed from the due date against local today. */
export function bucketOf(followUpDate) {
  const due = startOfDay(new Date(followUpDate));
  const today = startOfDay(new Date());
  if (isSameDay(due, today)) return "today";
  return isBefore(due, today) ? "overdue" : "upcoming";
}

export const BUCKETS = [
  {
    key: "overdue",
    label: "Overdue",
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-700",
  },
  {
    key: "today",
    label: "Due today",
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    card: "border-slate-200 bg-white",
    badge: "bg-slate-100 text-slate-700",
  },
];

export const bucketMeta = (key) => BUCKETS.find((b) => b.key === key) || BUCKETS[2];