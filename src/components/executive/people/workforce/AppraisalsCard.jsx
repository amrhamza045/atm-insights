import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { APPRAISAL_INFO } from "./workforceConfig";

const COLUMNS = [
  { key: "name", label: "Person", render: (r) => <><span className="block truncate" dir="auto">{r.name}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{r.department}</span></> },
  { key: "review", label: "Review period", render: (r) => <span className="text-slate-600">{[r.from, r.to].filter(Boolean).join(" – ") || "—"}</span> },
  { key: "rating", label: "Rating", format: "rating" },
  { key: "decision", label: "Decision", render: (r) => <span className={r.approved ? "text-success-700" : "text-danger-700"}>{r.approved ? "Approved" : "Rejected"}{r.day ? ` · ${r.day}` : ""}</span> },
];

// Appraisals decided in the period: the approved ratings, then each appraisal for HR viewers.
export default function AppraisalsCard({ appraisals: a, decided }) {
  const most = Math.max(1, ...(a.ratings || []).map((r) => r.count));
  return (
    <ReportCard title="Appraisals" subtitle={`${decided} decided in the period · ${a.waiting} waiting for a decision today`} info={APPRAISAL_INFO}>
      {a.ratings ? (
        <ul className="space-y-1.5">
          {a.ratings.map((r) => (
            <li key={r.rating} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="text-slate-600">{r.rating} / 5</span>
              <span className="h-2 overflow-hidden rounded-full bg-cream" aria-hidden="true"><span className="block h-full rounded-full bg-gold" style={{ width: `${(r.count / most) * 100}%` }} /></span>
              <span className="text-right tabular-nums text-navy">{r.count}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-slate-500">Ratings are shown once three or more appraisals are approved in the period.</p>}
      <div className="mt-4">
        {a.rows
          ? <ListTable rows={a.rows} columns={COLUMNS} empty="No appraisals were decided in the period." />
          : <p className="text-xs text-slate-500">Each appraisal is listed for people who can open HR records.</p>}
      </div>
    </ReportCard>
  );
}