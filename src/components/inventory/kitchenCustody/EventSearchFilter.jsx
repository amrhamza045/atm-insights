import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CalendarSearch, X } from "lucide-react";

const norm = (s) => String(s || "").toLowerCase().trim();
const isSubseq = (needle, hay) => {
  let i = 0;
  for (const c of hay) if (c === needle[i]) i++;
  return i === needle.length;
};
// Every typed word must appear in the text, or appear in order with gaps (typo-tolerant).
const fuzzyMatch = (query, text) => {
  const t = norm(text);
  return norm(query).split(/\s+/).filter(Boolean).every((w) => t.includes(w) || isSubseq(w, t));
};

// Type to search events; picking one adds it to the selected list (multi-select).
export default function EventSearchFilter({ events, selected, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  const matches = useMemo(() => events
    .filter((e) => !selected.includes(e.id) && (!query.trim() || fuzzyMatch(query, `${e.name} ${e.date || ""}`)))
    .slice(0, 8), [events, selected, query]);

  const add = (id) => { onChange([...selected, id]); setQuery(""); };

  return (
    <div className="flex-1 space-y-2">
      <div className="relative">
        <CalendarSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); add(matches[0].id); } }}
          placeholder="Filter by event"
          className="pl-9 bg-white"
        />
        {open && matches.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((e) => (
              <button key={e.id} type="button" onMouseDown={(ev) => { ev.preventDefault(); add(e.id); }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="truncate text-slate-800">{e.name}</span>
                {e.date && <span className="shrink-0 text-xs text-slate-500">{e.date}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs text-orange-800">
              {byId[id]?.name || "Event"}
              <button type="button" onClick={() => onChange(selected.filter((s) => s !== id))} aria-label="Remove event">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onChange([])} className="text-xs text-slate-500 hover:text-slate-800 underline">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}