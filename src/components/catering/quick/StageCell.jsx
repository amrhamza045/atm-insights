import React from "react";
import { Link } from "react-router-dom";
import { STAGE_TONES } from "./upcomingStages";

/** One stage of an upcoming event: a coloured chip and a short detail; opens its tab when `to` is given. */
export default function StageCell({ stage, to }) {
  const chip = (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STAGE_TONES[stage.tone]}`}>
      {stage.label}
    </span>
  );
  return (
    <div className="space-y-0.5">
      {to ? (
        <Link to={to} className="inline-flex rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {chip}
        </Link>
      ) : chip}
      {stage.detail && <p className="text-xs text-slate-500">{stage.detail}</p>}
    </div>
  );
}