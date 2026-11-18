import React from "react";
import { ListChecks, ArrowRight } from "lucide-react";
import { HOWTO_TASK_GROUPS } from "./howToChapters";

export default function HowToTaskIndex({ onOpenTask }) {
  return (
    <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6 print:break-after-page">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold text-slate-900">What do you need to do?</h2>
      </div>
      <p className="text-sm text-slate-600 mb-5">Pick a task to jump straight to its numbered steps.</p>

      <div className="space-y-5">
        {HOWTO_TASK_GROUPS.map((g) => (
          <div key={g.role}>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">{g.role}</p>
            <div className="flex flex-wrap gap-2">
              {g.tasks.map((t) => (
                <button
                  key={t.label}
                  onClick={() => onOpenTask(t)}
                  className="group relative inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-5 py-1.5 text-sm leading-none text-slate-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-900"
                >
                  <span className="leading-none">{t.label}</span>
                  <ArrowRight className="absolute right-1.5 top-1/2 -mt-1.5 w-3 h-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}