import React from "react";
import { SCOPE_GROUPS } from "@/components/support/supportCatalog";

const pillClass = (active) =>
  `px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
    active ? "bg-slate-900 text-white border-slate-900" : "bg-card hover:bg-muted text-slate-700"
  }`;

// Scope filter of the Support Customization workspace.
export default function SupportScopeButtons({ value, onChange, total }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => onChange("all")} className={pillClass(value === "all")}>
        All Scopes ({total})
      </button>
      {SCOPE_GROUPS.map((g) => (
        <button key={g.key} onClick={() => onChange(g.key)} className={pillClass(value === g.key)}>
          {g.label}
        </button>
      ))}
    </div>
  );
}