import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import LossTrip from "@/components/executive/catering/LossTrip";
import LossEventPicker from "./LossEventPicker";
import useLossEvent from "./useLossEvent";

const INFO = {
  calculation: "The period's delivered events: below target first (the biggest margin short of target first), then those that can't be analysed yet, then those on target. Pick one to walk through its loss step by step.",
  source: "Catering › delivered events of the selected branches and their latest actual-cost calculation.",
};

// The period's events beside the walkthrough of the one picked (Event P&L links here with ?loss_event_id=).
export default function LossEvents({ events, currency }) {
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("loss_event_id"));
  const picked = useLossEvent(selectedId);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
      <ReportCard title="Events" info={INFO}>
        <LossEventPicker events={events} selectedId={selectedId} onSelect={setSelectedId} currency={currency} />
      </ReportCard>
      {picked.isLoading ? <p role="status" className="py-12 text-center text-sm text-slate-500">Loading the event…</p>
        : picked.isError ? <p role="alert" className="py-12 text-center text-sm text-danger-700">This event couldn't be opened.</p>
        : <LossTrip key={selectedId || "none"} event={picked.data?.event || null} run={picked.data?.run} quote={picked.data?.quote} />}
    </div>
  );
}