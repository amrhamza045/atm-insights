import React from "react";
import { Link } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { cateringUrl } from "@/components/catering/cateringTabs";
import StageCell from "./StageCell";
import { STAGES, whenLabel } from "./upcomingStages";

/** One upcoming event: name, date and where each stage stands. Stages link to their tab for this event. */
export default function UpcomingEventRow({ event: e, today, hasTab }) {
  const linkTo = (tab) => (hasTab(tab) ? cateringUrl(tab, e.id) : null);
  const when = whenLabel(e.event_date, today);
  const eventLink = linkTo("events");

  return (
    <TableRow>
      <TableCell className="min-w-[11rem] align-top">
        {eventLink ? (
          <Link to={eventLink} className="font-medium text-slate-900 hover:text-amber-700">{e.event_name}</Link>
        ) : (
          <span className="font-medium text-slate-900">{e.event_name}</span>
        )}
        <p className="text-xs text-slate-500">{[e.client_name, `${e.expected_guests || 0} guests`].filter(Boolean).join(" · ")}</p>
      </TableCell>
      <TableCell className="whitespace-nowrap align-top">
        <p className="text-slate-800">{e.event_date}{e.start_time ? ` · ${e.start_time}` : ""}</p>
        <p className={`text-xs ${when.days >= 0 && when.days <= 7 ? "font-medium text-amber-700" : "text-slate-500"}`}>{when.label}</p>
      </TableCell>
      {STAGES.map((s) => (
        <TableCell key={s.key} className="min-w-[8.5rem] align-top">
          <StageCell stage={s.of(e)} to={linkTo(s.tab)} />
        </TableCell>
      ))}
    </TableRow>
  );
}