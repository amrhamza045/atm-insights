import React from "react";
import { FileQuestion } from "lucide-react";

/**
 * Bespoke quote lines have no recipe, so nothing can be exploded from them and
 * they contribute zero demand. They are shown here rather than dropped silently,
 * because ignoring them is exactly how an event arrives with missing ingredients.
 */
export default function UnmappedLinesNotice({ unmapped, missingQuote }) {
  if (!unmapped?.length && !missingQuote?.length) return null;

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileQuestion className="w-4 h-4 text-slate-600" />
        <p className="text-sm font-semibold text-slate-800">Needs your judgement — nothing was calculated for these</p>
      </div>

      {missingQuote?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Events with no active quote</p>
          <div className="space-y-0.5">
            {missingQuote.map((e) => (
              <p key={e.id} className="text-xs text-slate-600">• {e.name} ({e.date}) — no quote to explode</p>
            ))}
          </div>
        </div>
      )}

      {unmapped?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">
            Quote lines with no recipe ({unmapped.length}) — add anything they need with "Add item"
          </p>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {unmapped.map((u, i) => (
              <p key={i} className="text-xs text-slate-600">
                • <span className="font-medium">{u.name}</span> ×{u.quantity} — {u.reason}
                <span className="text-slate-400"> · {u.event_name}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}