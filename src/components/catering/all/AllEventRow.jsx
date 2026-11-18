import React from "react";
import OpenEventButton from "./OpenEventButton";

/** One event in an all-events list: name and date on the left; the tab's badges and "Open event" on the right. */
export default function AllEventRow({ event: e, tab, detail, buttonLabel, children }) {
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{e.event_name}</p>
        <p className="text-xs text-slate-500">{[e.event_date, e.client_name, detail].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <OpenEventButton tab={tab} eventId={e.id} label={buttonLabel} />
      </div>
    </div>
  );
}