import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import EventRequirementsOverview from "./EventRequirementsOverview";
import PrepBatchRow from "./PrepBatchRow";
import EventMenuItems from "./EventMenuItems";
import BatchEditDialog from "./BatchEditDialog";
import { useChefBoardAccess } from "./useChefBoardAccess";
import { useChefBoardPages } from "./useChefBoardPages";

export default function HeadChefBoard() {
  const { selectedBranchId } = useBranch();
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState("");
  const [eventId, setEventId] = useState("all");
  const [item, setItem] = useState("");
  const [editing, setEditing] = useState(null);

  const { loading: accessLoading, canEdit, employeeId } = useChefBoardAccess();
  const ready = !accessLoading && (canEdit || !!employeeId);

  const {
    shownEvents,
    eventOptions,
    batches: list,
    isLoading: pagesLoading,
    hasMore,
    loadingMore,
    loadMore,
    refresh,
  } = useChefBoardPages({
    ready,
    canEdit,
    employeeId,
    selectedBranchId,
    from,
    to,
    eventId,
    item,
  });

  const employees = useQuery({
    queryKey: ["chef-board-staff", selectedBranchId],
    enabled: ready && canEdit,
    queryFn: () =>
      base44.entities.Employee.filter(
        {
          status: "active",
          employment_type: { $ne: "system_account" },
          ...(selectedBranchId && { branch_id: selectedBranchId }),
        },
        "name",
        300
      ),
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <label className="text-xs text-muted-foreground">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40" /></label>
        <label className="text-xs text-muted-foreground">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40" /></label>
        <div className="text-xs text-muted-foreground">Event
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="mt-1 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {eventOptions.map((e) => <SelectItem key={e.id} value={e.id}>{e.event_name} · {e.event_date}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="text-xs text-muted-foreground flex-1 min-w-[200px]">Item name<Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Search items…" className="mt-1" /></label>
      </div>

      {ready && shownEvents.map((ev) => (
        <EventMenuItems key={ev.id} event={ev} showTitle={eventId === "all"} itemFilter={item}
          batches={list} employees={employees.data || []} canEdit={canEdit} employeeId={employeeId} onEditBatch={setEditing} />
      ))}

      {ready && !pagesLoading && shownEvents.length > 0 && (
        <div className="flex items-center justify-center py-3 mb-4">
          {hasMore ? (
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="gap-2">
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              {loadingMore ? "Loading more events…" : "Load more"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              All matching events loaded ({shownEvents.length})
            </p>
          )}
        </div>
      )}

      {!accessLoading && !ready ? (
        <p className="text-center text-muted-foreground py-16">Your account isn't linked to an active employee record, so no assigned batches can be shown.</p>
      ) : accessLoading || pagesLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        shownEvents.length === 0 && <p className="text-center text-muted-foreground py-16">{canEdit ? "No prep batches match these filters." : "Nothing is assigned to you for these dates."}</p>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming event requirements</h3>
          <EventRequirementsOverview batches={list} />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Prep batches</h3>
          <Card className="overflow-hidden">
            {list.map((b) => <PrepBatchRow key={b.id} batch={b} canEdit={canEdit} onEdit={setEditing} onChanged={refresh} />)}
          </Card>
        </>
      )}

      {canEdit && editing && (
        <BatchEditDialog batch={editing} employees={employees.data || []} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }} />
      )}
    </div>
  );
}