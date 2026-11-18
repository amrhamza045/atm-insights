import { useState } from "react";
import { Link } from "react-router-dom";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { cateringUrl } from "@/components/catering/cateringTabs";

// Events dated before today that were never marked delivered or cancelled: no
// delivered-event report or pipeline-ahead figure counts them, so they are flagged here.
export default function OverdueEvents({ overdue, currency }) {
  const [all, setAll] = useState(false);
  if (!overdue?.count) return null;
  const one = overdue.count === 1;
  return (
    <div role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
      <p>
        {overdue.count} {one ? "event" : "events"} dated before today, worth {fmtMoney(overdue.value, currency)} in quotes, {one ? "was" : "were"} never
        marked delivered or cancelled, so the delivered-event reports and the pipeline ahead leave {one ? "it" : "them"} out. Complete {one ? "its" : "each"} wrap-up in Catering, or cancel {one ? "it" : "them"}.
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {(all ? overdue.events : overdue.events.slice(0, 5)).map((e) => (
          <li key={e.id}>
            <Link to={cateringUrl("events", e.id)} className="font-semibold hover:underline" dir="auto">{e.name}</Link> · {e.date} · {e.stage} · {fmtMoney(e.value, currency)}
          </li>
        ))}
      </ul>
      {overdue.events.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 font-semibold hover:underline">{all ? "Show fewer" : `Show all ${overdue.events.length}`}</button>
      )}
    </div>
  );
}