import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Factory, ClipboardList, Loader2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchAndSort, SORT_OPTIONS } from "@/components/kds/kdsEventSearch";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import ReleaseSlipDrawer from "@/components/catering/ReleaseSlipDrawer";
import ReleaseSlipPdfButton from "@/components/catering/ReleaseSlipPdfButton";
import KdsQuoteItems from "@/components/kds/KdsQuoteItems";
import { batchLabel } from "@/components/catering/releaseSlipMeta";
import KdsRequisitionsView from "@/components/kds/requisitions/KdsRequisitionsView";
import { useLinkedRequisition } from "@/components/catering/requisition/useLinkedRequisition";
import { useKdsStaffScope } from "@/components/kds/useKdsStaffScope";
import { ownsLine } from "@/components/kds/board/itemOwnership";

const FILTERS = [
  { key: "both", label: "Both" },
  { key: "production", label: "Planned Production" },
  { key: "slips", label: "Stock Release Slips" },
];
const REQUISITIONS_FILTER = { key: "requisitions", label: "Requisitions" };

const STATUS_CLASS = {
  pending: "bg-blue-600", in_progress: "bg-warning-600", completed: "bg-green-600", open: "bg-warning-600", fulfilled: "bg-green-600", scheduled: "bg-sky-600", released: "bg-green-600", received: "bg-green-700",
};

export default function CateringKdsPanel({ onCounts }) {
  const { selectedBranchId } = useBranch();
  const { assigned } = usePermissions();
  const [filter, setFilter] = useState(() =>
    new URLSearchParams(window.location.search).get("view") === "requisitions" ? "requisitions" : "both"
  );
  const [selected, setSelected] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_asc");
  const [prodStatus, setProdStatus] = useState("all");
  // Same assigned flags as perm_requisition_view in the requisition data rules.
  const canViewRequisitions = assigned?.requisition_view === true;
  const filters = canViewRequisitions ? [...FILTERS, REQUISITIONS_FILTER] : FILTERS;
  // A requisition notification link opens the Requisitions view (the view opens the requisition itself).
  useLinkedRequisition(() => setFilter("requisitions"), canViewRequisitions);
  const dateRange = from || to ? { needed_by_date: { ...(from && { $gte: from }), ...(to && { $lte: to }) } } : {};
  const branchQuery = { ...(selectedBranchId ? { branch_id: selectedBranchId } : {}), ...dateRange };
  // Staff who can't edit see only events and items assigned to them (a prep batch or a direct item assignment).
  const scope = useKdsStaffScope();
  const mine = scope.restricted ? { "assigned_staff.employee_id": scope.employeeId } : {};
  const myEventKey = scope.restricted ? scope.eventIds.join(",") : "all";

  const production = useQuery({
    queryKey: ["kds-catering-production", selectedBranchId, from, to, prodStatus, myEventKey, scope.employeeId],
    queryFn: () => base44.entities.ProductionOrder.filter({ ...branchQuery, ...mine, order_source: "catering", status: prodStatus === "all" ? { $in: ["pending", "in_progress"] } : prodStatus }, "needed_by_date", 200),
    enabled: scope.ready,
    refetchInterval: 15000,
  });
  const slips = useQuery({
    queryKey: ["kitchen-release-slips", selectedBranchId, "kds", from, to, myEventKey],
    queryFn: () => base44.entities.KitchenReleaseSlip.filter({ ...branchQuery, status: "scheduled", ...(scope.restricted ? { event_id: { $in: scope.eventIds } } : {}) }, "needed_by_date", 200),
    enabled: scope.ready && (!scope.restricted || scope.eventIds.length > 0),
    refetchInterval: 15000,
  });
  const myEvents = useQuery({
    queryKey: ["kds-my-events", selectedBranchId, myEventKey, from, to],
    queryFn: () => base44.entities.CateringEvent.filter({
      id: { $in: scope.eventIds },
      status: { $nin: ["cancelled", "completed"] },
      ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
      ...((from || to) && { event_date: { ...(from && { $gte: from }), ...(to && { $lte: to }) } }),
    }, "event_date", 200),
    enabled: scope.ready && scope.restricted && scope.eventIds.length > 0,
  });
  const inventory = useQuery({
    queryKey: ["release-slip-inventory", selectedBranchId],
    queryFn: () => base44.entities.InventoryItem.filter({ branch_id: selectedBranchId }, "name", 1000),
    enabled: !!selected && !!selectedBranchId,
  });
  const reservations = useQuery({
    queryKey: ["release-slip-reservations", selectedBranchId],
    queryFn: () => base44.entities.CateringReservation.filter({ branch_id: selectedBranchId, status: "reserved" }, "needed_by_date", 1000),
    enabled: !!selected && !!selectedBranchId,
  });

  const groups = useMemo(() => {
    const map = new Map();
    const get = (id, name, date) => {
      if (!map.has(id)) map.set(id, { id, name, date, production: [], slips: [] });
      return map.get(id);
    };
    // Events where the person only has direct item assignments (no batch) still get a card.
    if (filter !== "slips") (myEvents.data || []).filter((e) => scope.myAssignments.some((a) => a.event_id === e.id)).forEach((e) => get(e.id, e.event_name, e.event_date));
    if (filter !== "slips") (production.data || []).forEach((o) => get(o.catering_event_id || "none", o.catering_event_name || "Unlinked event", o.needed_by_date).production.push(o));
    if (filter !== "production") (slips.data || []).forEach((s) => get(s.event_id, s.event_name, s.needed_by_date || s.event_date).slips.push(s));
    return searchAndSort([...map.values()], search, sort);
  }, [production.data, slips.data, myEvents.data, scope.myAssignments, filter, search, sort]);

  // Requisition batch slips not yet released by Inventory.
  const openSlipCount = (slips.data || []).filter((s) => s.status === "scheduled").length;
  const unfinishedProductionCount = (production.data || []).filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const today = new Date().toISOString().slice(0, 10);
  const start = from && from > today ? from : today;
  const upcoming = useQuery({
    queryKey: ["kds-upcoming-events", selectedBranchId, start, to, myEventKey],
    enabled: scope.ready,
    queryFn: () => base44.entities.CateringEvent.count({
      ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
      ...(scope.restricted ? { id: { $in: scope.eventIds } } : {}),
      status: { $nin: ["completed", "cancelled"] },
      event_date: { $gte: start, ...(to && { $lte: to }) },
    }),
  });
  const upcomingCount = upcoming.data || 0;
  useEffect(() => {
    onCounts?.({ slips: openSlipCount, production: unfinishedProductionCount, upcoming: upcomingCount });
    return () => onCounts?.({ slips: 0, production: 0, upcoming: 0 });
  }, [openSlipCount, unfinishedProductionCount, upcomingCount, onCounts]);

  const loading = !scope.ready || production.isLoading || slips.isLoading || myEvents.isLoading;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-6 h-6 text-primary" /> Events</h2>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1 text-muted-foreground">From<Input type="date" className="h-9 w-40" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="flex items-center gap-1 text-muted-foreground">To<Input type="date" className="h-9 w-40" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search events, items, slips…" className="h-9 w-64 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={prodStatus} onValueChange={setProdStatus}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All production</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex bg-card rounded-lg p-1 gap-1">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {filter === "requisitions" && canViewRequisitions ? (
        <KdsRequisitionsView />
      ) : scope.unlinked ? (
        <div className="p-10 text-center text-muted-foreground bg-card rounded-lg border border-border">Your account isn't linked to an active employee record, so no assigned work can be shown.</div>
      ) : loading ? (
        <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : groups.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground bg-card rounded-lg border border-border">{search ? "No events match your search" : scope.restricted ? "Nothing is assigned to you for this selection" : "No open catering work for this selection"}</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div>
                <p className="text-lg font-semibold">{g.name}</p>
                <p className="text-xs text-muted-foreground">Needed by {g.date || "—"}</p>
              </div>
              <KdsQuoteItems eventId={g.id} isMine={scope.restricted ? (l) => ownsLine(l, g.id, g.production, scope.myAssignments) : null} />
              {g.production.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1"><Factory className="w-3.5 h-3.5" /> Planned production</p>
                  {g.production.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-2 p-2 rounded bg-secondary text-secondary-foreground">
                      <span className="text-sm">{o.target_quantity}× {o.output_item_name || o.recipe_name}</span>
                      <Badge className={STATUS_CLASS[o.status]}>{o.status.replace("_", " ")}</Badge>
                    </div>
                  ))}
                  <Button asChild size="sm" variant="outline" className="w-full mt-1 bg-transparent border-border text-foreground"><Link to="/Manufacturing">Manage production</Link></Button>
                </div>
              )}
              {g.slips.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Stock release slips</p>
                  {g.slips.map((s) => (
                    <div key={s.id} role="button" onClick={() => setSelected(s)} className="w-full text-left p-2 rounded bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm">{s.slip_number}{batchLabel(s) ? ` · ${batchLabel(s)} · needed ${s.needed_by_date}` : ""} · {s.lines?.length || 0} line(s)</span>
                        <Badge className={STATUS_CLASS[s.status]}>{s.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {s.shortfall_count > 0 ? <p className="text-xs text-red-400">{s.shortfall_count} shortfall(s)</p> : <span />}
                        <div className="text-foreground"><ReleaseSlipPdfButton slip={s} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReleaseSlipDrawer slip={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} inventory={inventory.data || []} reservations={reservations.data || []} />
    </section>
  );
}