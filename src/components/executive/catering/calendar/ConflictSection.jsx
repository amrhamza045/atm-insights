import React from "react";
import ConflictBadge from "./ConflictBadge";

const TITLES = { venue: "Venue", staff: "Staff", equipment: "Equipment" };

// One conflict group inside the detail drawer. Counterparty names are deep links,
// so a clash with a filtered-out event is still reachable.
export default function ConflictSection({ type, items = [], onJumpToEvent }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{TITLES[type]}</p>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div
            key={`${type}-${idx}`}
            className={`rounded-md border p-2 ${
              item.isOverride
                ? "border-slate-200 bg-slate-50"
                : item.severity === "hard"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-1.5">
              <ConflictBadge severity={item.isOverride ? "override" : item.severity} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className={`text-xs font-medium ${item.isOverride ? "text-slate-600" : "text-slate-900"}`}>
                  {item.label}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>

                {(item.others || []).length > 0 && onJumpToEvent && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {item.others.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => onJumpToEvent(o.id)}
                        className="text-[11px] font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
                      >
                        {o.name}
                      </button>
                    ))}
                  </div>
                )}

                {item.override && (
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Accepted by {item.override.by}
                    {item.override.reason ? ` — ${item.override.reason}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}