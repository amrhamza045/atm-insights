// The dashboard's pages, then the open reports of the current page.
// groups: only pages with at least one open report (see useExecutiveTrail).
export default function DashboardGroupNav({ groups, activeGroup, activeTab, onTabChange }) {
  const group = groups.find((g) => g.key === activeGroup) || groups[0];

  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Dashboard pages" className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            aria-current={g.key === activeGroup ? "page" : undefined}
            onClick={() => onTabChange(g.tabs[0].value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              g.key === activeGroup
                ? "bg-navy text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {g.label}
          </button>
        ))}
      </nav>

      {group.tabs.length > 1 && (
        <nav aria-label={`${group.label} reports`} className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {group.tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-current={t.value === activeTab ? "page" : undefined}
              onClick={() => onTabChange(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                t.value === activeTab
                  ? "bg-cream text-navy border border-gold"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}