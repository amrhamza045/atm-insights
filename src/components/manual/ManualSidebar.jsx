import { useState } from "react";
import { Search, ChevronDown, ChevronRight, Map } from "lucide-react";
import { buildManualTree } from "@/components/manual/manualTree";
import { FINANCE_STATUS } from "@/components/manual/financeStatus";

// Domain › Chapter › Module navigation. Domains collapse; search opens them all.
export default function ManualSidebar({ sections, selectedModule, onSelect, searchQuery, onSearch, onShowMap, showingMap, t }) {
  const tree = buildManualTree(sections);
  const [closed, setClosed] = useState(() => new Set());
  const toggle = (name) => setClosed((prev) => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t?.search || "Search modules..."}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onShowMap}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${showingMap ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <Map className="w-4 h-4" />
          {t?.systemMap || "System map & Finance links"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {tree.length === 0 && <p className="text-sm text-slate-400 text-center py-8">{t?.noModules || "No modules found"}</p>}
        {tree.map((domain) => {
          const open = !!searchQuery || !closed.has(domain.name);
          const count = domain.chapters.reduce((n, c) => n + c.modules.length, 0);
          return (
            <div key={domain.name} className="mb-1">
              <button onClick={() => toggle(domain.name)} className="flex items-center gap-1.5 w-full px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />}
                <span>{domain.number ? `${domain.number}. ` : ""}{domain.name}</span>
                <span className="text-xs text-slate-400 ms-auto">{count}</span>
              </button>
              {open && domain.chapters.map((chapter) => (
                <div key={chapter.name} className="ms-3 mb-1">
                  <p className="px-3 pt-1.5 pb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{chapter.code} {chapter.name}</p>
                  {chapter.modules.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onSelect(m)}
                      className={`w-full flex items-center gap-2 text-start px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedModule?.id === m.id && !showingMap ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${FINANCE_STATUS[m.finance_status]?.dot || "bg-slate-200"}`} />
                      <span>{m.module_name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}