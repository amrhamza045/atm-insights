import React from "react";

/** Two-level catering nav: parent row + horizontally scrollable sub-tab row. */
export default function CateringTabNav({ groups, activeGroup, activeTab, onSelectGroup, onSelectTab }) {
  const current = groups.find((g) => g.key === activeGroup);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {groups.map((group) => (
          <button
            key={group.key}
            onClick={() => onSelectGroup(group.key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeGroup === group.key
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <group.icon className="w-4 h-4" />
            {group.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {(current?.tabs || []).map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-amber-100 text-amber-700"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}