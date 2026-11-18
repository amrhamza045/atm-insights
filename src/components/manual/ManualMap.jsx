import { buildManualTree } from "@/components/manual/manualTree";
import { FINANCE_STATUS, FINANCE_STATUS_ORDER } from "@/components/manual/financeStatus";

// One-page overview of the whole manual: every domain, chapter and module with
// its Finance link status, so the finance team sees what is connected and what
// is still to be linked.
export default function ManualMap({ sections, onSelect, t, language }) {
  const tree = buildManualTree(sections);
  const counts = FINANCE_STATUS_ORDER.map((key) => [key, sections.filter((s) => s.finance_status === key).length]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t?.systemMap || "System map & Finance links"}</h1>
        <p className="text-sm text-slate-500 mt-1">{t?.mapIntro || "Every module by domain and chapter, with how it connects to Finance today. Click a module to open its chapter."}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {counts.map(([key, n]) => (
          <div key={key} className={`rounded-lg p-3 ${FINANCE_STATUS[key].badge}`}>
            <p className="text-2xl font-bold">{n}</p>
            <p className="text-xs font-medium">{FINANCE_STATUS[key][language] || FINANCE_STATUS[key].en}</p>
          </div>
        ))}
      </div>
      {tree.map((domain) => (
        <div key={domain.name} className="rounded-lg border border-slate-200 bg-white">
          <h2 className="px-4 py-3 border-b border-slate-200 text-lg font-semibold text-slate-800">{domain.number ? `${domain.number}. ` : ""}{domain.name}</h2>
          <div className="divide-y divide-slate-100">
            {domain.chapters.map((chapter) => (
              <div key={chapter.name} className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{chapter.code} {chapter.name}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {chapter.modules.map((m) => {
                    const status = FINANCE_STATUS[m.finance_status];
                    return (
                      <button key={m.id} onClick={() => onSelect(m)} className="text-start rounded-md border border-slate-200 p-2.5 hover:border-blue-400">
                        <p className="text-sm font-medium text-slate-800">{m.module_name}</p>
                        {m.nav_path && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{m.nav_path}</p>}
                        {status && <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs ${status.badge}`}>{status[language] || status.en}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}