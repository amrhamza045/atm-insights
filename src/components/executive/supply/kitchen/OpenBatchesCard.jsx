import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { OPEN_INFO } from "./kitchenConfig";

// The batches still open on the Head Chef board today, overdue first.
export default function OpenBatchesCard({ open }) {
  const stage = Object.fromEntries(open.stages.map((s) => [s.key, s.label]));
  const columns = [
    { key: "name", label: "Batch", render: (r) => <><span className="block truncate" dir="auto">{r.name}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{[r.purpose, r.branch].filter(Boolean).join(" · ")}</span></> },
    { key: "stage", label: "Stage", render: (r) => <span className="text-slate-600">{stage[r.stage]}</span> },
    { key: "due", label: "Needed by", render: (r) => <span className={r.overdue ? "text-danger-700" : ""}>{r.due || "—"}{r.overdue ? " · overdue" : ""}</span> },
  ];
  return (
    <ReportCard title="Open batches" subtitle={`As of today · ${open.count} open, ${open.overdue} overdue`} info={OPEN_INFO}>
      <div className="mb-3 flex flex-wrap gap-2">
        {open.stages.filter((s) => s.count > 0).map((s) => (
          <span key={s.key} className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-navy">{s.label}: {s.count}</span>
        ))}
      </div>
      <ListTable rows={open.rows} columns={columns} empty="No batches are open." />
      {open.count > open.rows.length && <p className="mt-2 text-[11px] text-slate-400">The first {open.rows.length} of {open.count} are listed.</p>}
    </ReportCard>
  );
}