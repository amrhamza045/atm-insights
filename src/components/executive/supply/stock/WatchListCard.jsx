import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtNumber } from "@/components/executive/kit/formatters";
import { WATCH_INFO } from "./stockConfig";

const FLAGS = {
  expired: ["Expired", "bg-danger-50 text-danger-700"],
  expiring: ["Expires within a week", "bg-warning-50 text-warning-800"],
  low: ["Low stock", "bg-warning-50 text-warning-800"],
  out: ["Out of stock", "bg-slate-100 text-slate-600"],
};

const COLUMNS = [
  { key: "name", label: "Item", render: (r) => <><span className="block truncate" dir="auto">{r.name}</span>{r.branch && <span className="block truncate text-[11px] text-slate-400" dir="auto">{r.branch}</span>}</> },
  { key: "flag", label: "Why", render: (r) => <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${FLAGS[r.flag][1]}`}>{FLAGS[r.flag][0]}</span> },
  { key: "quantity", label: "On hand", render: (r) => `${fmtNumber(r.quantity)} ${r.unit}` },
  { key: "threshold", label: "Alert level", render: (r) => (r.threshold > 0 ? `${fmtNumber(r.threshold)} ${r.unit}` : "—") },
  { key: "expiry", label: "Expiry" },
  { key: "value", label: "Value", format: "money" },
];

// The stock items that need attention today.
export default function WatchListCard({ watch, currency }) {
  const counts = Object.entries(watch.counts).filter(([, n]) => n > 0);
  const subtitle = counts.length ? counts.map(([f, n]) => `${n} ${FLAGS[f][0].toLowerCase()}`).join(" · ") : "As of today";
  return (
    <ReportCard title="Stock to look at" subtitle={subtitle} info={WATCH_INFO}>
      <ListTable rows={watch.rows} columns={COLUMNS} currency={currency} empty="Nothing is expired, expiring, low or out of stock." />
      {watch.total > watch.rows.length && <p className="mt-2 text-[11px] text-slate-400">The first {watch.rows.length} of {watch.total} are listed.</p>}
    </ReportCard>
  );
}