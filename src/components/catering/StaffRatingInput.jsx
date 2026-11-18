import React from "react";
import { Star } from "lucide-react";

export default function StaffRatingInput({ value = 0, onChange, readOnly = false }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className="p-0.5 disabled:cursor-default"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star className={`w-5 h-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}