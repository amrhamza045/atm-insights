import { useState } from "react";
import { AlertTriangle } from "lucide-react";

const SHOWN = 8;

// Names of the people an email reaches right now, with the rest behind "+N more".
export default function PeopleList({ people, emptyText }) {
  const [all, setAll] = useState(false);
  if (!people.length) {
    return <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5" />{emptyText}</p>;
  }
  const shown = all ? people : people.slice(0, SHOWN);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((p, i) => (
        <span key={`${p.email}-${i}`} title={p.email} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">{p.name}</span>
      ))}
      {people.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
          {all ? "Show less" : `+${people.length - SHOWN} more`}
        </button>
      )}
    </div>
  );
}