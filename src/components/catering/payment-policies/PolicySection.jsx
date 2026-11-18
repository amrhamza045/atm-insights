import React from "react";

/** A titled block inside the policy editor. */
export default function PolicySection({ title, hint, children }) {
  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}