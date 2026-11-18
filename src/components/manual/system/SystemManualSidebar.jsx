import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SystemManualSidebar({ chapters, activeKey, onSelect, query, onQuery }) {
  const q = query.trim().toLowerCase();
  const visible = q
    ? chapters.filter((c) => c.title.toLowerCase().includes(q) || c.audience.toLowerCase().includes(q) || c.content.toLowerCase().includes(q))
    : chapters;

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search the manual…" className="pl-8 h-9" />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {visible.length === 0 && <p className="text-sm text-slate-400 px-3 py-4">No chapters match.</p>}
        {[...new Set(visible.map((c) => c.group).filter(Boolean))].map((group) => (
          <div key={group} className="pt-2 first:pt-0">
            <p className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">{group}</p>
            {visible.filter((c) => c.group === group).map((c) => (
              <button key={c.key} onClick={() => onSelect(c.key)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${c.key === activeKey ? "bg-amber-100 text-amber-900" : "hover:bg-slate-100 text-slate-700"}`}>
                <p className="text-sm font-medium">{c.number}. {c.title}</p>
                <p className="text-xs text-slate-500 truncate">{c.audience}</p>
              </button>
            ))}
          </div>
        ))}
        {visible.filter((c) => !c.group).map((c) => (
          <button key={c.key} onClick={() => onSelect(c.key)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${c.key === activeKey ? "bg-amber-100 text-amber-900" : "hover:bg-slate-100 text-slate-700"}`}>
            <p className="text-sm font-medium">{c.number}. {c.title}</p>
            <p className="text-xs text-slate-500 truncate">{c.audience}</p>
          </button>
        ))}
      </nav>
    </div>
  );
}