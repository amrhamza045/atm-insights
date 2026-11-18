import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { useBranch } from "@/components/branches/BranchContext";
import ReleaseSlipList from "./ReleaseSlipList";
import ReleaseSlipDrawer from "./ReleaseSlipDrawer";
import CateringRequisitionsList from "./requisition/CateringRequisitionsList";
import FilterSelect from "./all/FilterSelect";
import { WHEN_OPTIONS, whenQuery } from "./all/allEventsQuery";

export default function ReleaseSlipsTab({ eventId = null }) {
  const { selectedBranchId } = useBranch();
  const [status, setStatus] = useState("scheduled");
  const [when, setWhen] = useState("upcoming");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(null);
  // Scoped to an event: all of its slips. Branch-wide: only the chosen event dates, read from the server.
  const slipQuery = { branch_id: selectedBranchId, ...(eventId ? { event_id: eventId } : whenQuery("event_date", when).query) };
  const slipSort = eventId || when === "upcoming" ? "needed_by_date" : "-needed_by_date";
  const slips = useQuery({ queryKey: ["kitchen-release-slips", selectedBranchId, slipQuery, slipSort], queryFn: () => base44.entities.KitchenReleaseSlip.filter(slipQuery, slipSort, 300), enabled: !!selectedBranchId });
  const inventory = useQuery({ queryKey: ["release-slip-inventory", selectedBranchId], queryFn: () => base44.entities.InventoryItem.filter({ branch_id: selectedBranchId }, "name", 1000), enabled: !!selectedBranchId && !!selected });
  const reservations = useQuery({ queryKey: ["release-slip-reservations", selectedBranchId], queryFn: () => base44.entities.CateringReservation.filter({ branch_id: selectedBranchId, status: "reserved" }, "needed_by_date", 1000), enabled: !!selectedBranchId && !!selected });
  const [eventFilter, setEventFilter] = useState("");
  const events = useMemo(() => [...new Map((slips.data || []).map((s) => [s.event_id, s.event_name])).entries()], [slips.data]);
  const visible = useMemo(() => (slips.data || []).filter((slip) => (!eventId || slip.event_id === eventId) && (!eventFilter || slip.event_id === eventFilter) && (status === "all" || slip.status === status) && (!from || (slip.needed_by_date || slip.event_date) >= from) && (!to || (slip.needed_by_date || slip.event_date) <= to)), [slips.data, status, from, to, eventId, eventFilter]);
  return <div className="space-y-6">
    {!eventId && <div className="flex items-center justify-end gap-2"><span className="text-xs text-slate-500">Event dates</span><FilterSelect value={when} onChange={(v) => { setWhen(v); setEventFilter(""); }} options={WHEN_OPTIONS} /></div>}
    <section className="space-y-3"><h3 className="font-semibold text-slate-900">Requisitions</h3><CateringRequisitionsList branchId={selectedBranchId} eventId={eventId} when={when} /></section>
    <section className="space-y-4"><h3 className="font-semibold text-slate-900">Release batches &amp; history</h3>
    <div className="flex flex-wrap gap-2 items-end"><label className="text-xs text-slate-600">Status<select className="block mt-1 h-9 rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="scheduled">Scheduled</option><option value="released">Released</option><option value="received">Received</option><option value="fulfilled">Fulfilled (old flow)</option><option value="void">Void</option><option value="all">All</option></select></label>{!eventId && <label className="text-xs text-slate-600">Event<select className="block mt-1 h-9 rounded-md border border-input bg-white px-3 text-sm" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="">All events</option>{events.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}<label className="text-xs text-slate-600">Needed from<Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-xs text-slate-600">Needed to<Input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
    <ReleaseSlipList slips={visible} loading={slips.isLoading} onOpen={setSelected} />
    </section>
    <ReleaseSlipDrawer slip={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} inventory={inventory.data || []} reservations={reservations.data || []} />
  </div>;
}