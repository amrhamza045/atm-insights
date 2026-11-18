import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import MenuItemAssign from "./MenuItemAssign";
import { batchMatchesLine, itemKey } from "./itemOwnership";

const norm = (s) => (s || "").trim().toLowerCase();

// Every menu item on the event's active quote — batched or not — with assignment.
export default function EventMenuItems({ event, batches, employees, canEdit, employeeId, onEditBatch, showTitle, itemFilter = "" }) {
  const quote = useQuery({
    queryKey: ["chef-board-quote", event?.active_quote_id],
    queryFn: () => base44.entities.CateringQuote.get(event.active_quote_id),
    enabled: !!event?.active_quote_id,
  });
  const assignments = useQuery({
    queryKey: ["chef-board-item-assign", event?.id],
    queryFn: () => base44.entities.KitchenItemAssignment.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });
  if (!event?.active_quote_id) return null;
  const eventBatches = batches.filter((b) => b.catering_event_id === event.id);
  const findBatch = (l) => eventBatches.find((b) => batchMatchesLine(b, l));
  const isMine = (l) => {
    const batch = findBatch(l);
    if (batch) return (batch.assigned_staff || []).some((s) => s.employee_id === employeeId);
    return (assignments.data || []).some((a) => a.item_key === itemKey(l) && a.employee_id === employeeId);
  };
  const needle = norm(itemFilter);
  const lines = (quote.data?.line_items || [])
    .filter((l) => l.item_type !== "custom" || l.menu_item_id)
    .filter((l) => canEdit || (employeeId && isMine(l)))
    .filter((l) => !needle || norm(l.name).includes(needle));

  return (
    <>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {showTitle ? `${event.event_name} · ${event.event_date}` : canEdit ? "Menu items" : "My assigned items"}
      </h3>
      <Card className="mb-6 divide-y divide-border">
        {quote.isLoading || assignments.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">{canEdit ? "No menu items on the active quote." : "No menu items are assigned to you for this event."}</p>
        ) : lines.map((l, i) => {
          const batch = findBatch(l);
          const key = itemKey(l);
          const assignment = (assignments.data || []).find((a) => a.item_key === key);
          const staff = batch ? (batch.assigned_staff || []).map((s) => s.name).join(", ") : assignment?.employee_name;
          return (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{l.name}</p>
                  {batch
                    ? <Badge className="bg-success-100 text-success-700 hover:bg-success-100">Prep batch</Badge>
                    : <Badge variant="outline" className="text-muted-foreground">No batch</Badge>}
                </div>
                {l.kitchen_note && <p className="text-xs text-warning-600">Note: {l.kitchen_note}</p>}
                {!canEdit && staff && <p className="text-xs text-muted-foreground">Assigned: {staff}</p>}
              </div>
              <span className="text-muted-foreground whitespace-nowrap">{l.quantity}×</span>
              {canEdit && (batch ? (
                <Button size="sm" variant="outline" className="h-8 w-44 text-xs truncate" onClick={() => onEditBatch(batch)}>
                  {staff || "Assign staff"}
                </Button>
              ) : (
                <MenuItemAssign event={event} quoteId={event.active_quote_id} itemKey={key} itemName={l.name}
                  assignment={assignment} employees={employees} onChanged={assignments.refetch} />
              ))}
            </div>
          );
        })}
      </Card>
    </>
  );
}