import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

// options: [{ value, label, sub }]. Inline list, so it scrolls and types fine inside a dialog.
export default function EventPicker({ value, options, onChange, loading }) {
  const [term, setTerm] = useState("");
  const selected = options.find((o) => o.value === value);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{selected.label}</p>
          {selected.sub && <p className="text-xs text-slate-500 truncate">{selected.sub}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Change</Button>
      </div>
    );
  }

  const q = term.trim().toLowerCase();
  const matches = options.filter((o) => !q || `${o.label} ${o.sub}`.toLowerCase().includes(q)).slice(0, 30);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search event or client" className="pl-8" />
      </div>
      <div className="rounded-lg border border-slate-200 divide-y max-h-48 overflow-y-auto">
        {loading ? (
          <p className="p-3 text-sm text-slate-500">Loading events…</p>
        ) : matches.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No matching event.</p>
        ) : (
          matches.map((o) => (
            <button key={o.value} type="button" onClick={() => onChange(o.value)} className="w-full text-left p-2.5 hover:bg-slate-50">
              <span className="block text-sm font-medium text-slate-900 truncate">{o.label}</span>
              {o.sub && <span className="block text-xs text-slate-500 truncate">{o.sub}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}