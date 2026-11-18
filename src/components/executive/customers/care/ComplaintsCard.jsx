import NamedListCard from "../NamedListCard";
import { dayLabel } from "../customerLabels";
import { COMPLAINTS_INFO } from "./careConfig";

// The period's complaints, latest first: the client, the day, what was said
// and who logged it.
export default function ComplaintsCard({ rows }) {
  return (
    <NamedListCard title="Complaints" info={COMPLAINTS_INFO} rows={rows} subtitle="Latest first">
      {rows?.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No complaints were logged in this period.</p> : (
        <ul className="divide-y divide-slate-100">
          {rows?.map((c) => (
            <li key={c.id} className="py-2.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-slate-700" dir="auto">{c.client}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{dayLabel(c.day)}</span>
              </div>
              {c.note && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600" dir="auto">{c.note}</p>}
              {c.logged_by && <p className="mt-0.5 text-[11px] text-slate-400">Logged by {c.logged_by}</p>}
            </li>
          ))}
        </ul>
      )}
    </NamedListCard>
  );
}