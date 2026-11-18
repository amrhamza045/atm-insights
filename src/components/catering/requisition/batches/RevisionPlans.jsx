import React from "react";

const summary = (plan) => (plan || []).map((b, i) => (
  <li key={b.slip_id || i}>
    <span className="text-foreground">{b.batch_number ? `Batch ${b.batch_number}` : "New batch"} · {b.needed_by_date}</span>
    {": "}{(b.lines || []).map((x) => `${x.inventory_item_name} ${x.quantity} ${x.unit || ""}`.trim()).join(", ")}
  </li>
));

/** History: the current and proposed batch plans stored on a scheduled / split_* revision. */
export default function RevisionPlans({ revision }) {
  const current = revision.current_plan || [];
  const proposed = revision.proposed_plan || [];
  if (!current.length && !proposed.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
      <div><p className="font-medium">Current plan</p>{current.length ? <ul className="list-disc pl-4">{summary(current)}</ul> : <p>—</p>}</div>
      <div><p className="font-medium">{revision.action === "scheduled" ? "Scheduled" : "Proposed plan"}</p><ul className="list-disc pl-4">{summary(proposed)}</ul></div>
    </div>
  );
}