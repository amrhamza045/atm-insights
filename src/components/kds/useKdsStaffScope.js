import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useChefBoardAccess } from "@/components/kds/board/useChefBoardAccess";

const EMPTY = [];

/**
 * Kitchen Display scope. Editors (Head Chef and anyone who can plan) see every
 * event. Everyone else sees only events where a prep batch or a menu item is
 * assigned to them, and only those items.
 */
export function useKdsStaffScope() {
  const { loading, canEdit, employeeId } = useChefBoardAccess();
  const restricted = !loading && !canEdit;
  const mineEnabled = restricted && !!employeeId;

  const batchEvents = useQuery({
    queryKey: ["kds-my-batch-events", employeeId],
    queryFn: () => base44.entities.ProductionOrder.filter(
      { order_source: "catering", "assigned_staff.employee_id": employeeId },
      { distinct: "catering_event_id" }
    ),
    enabled: mineEnabled,
  });
  const assignments = useQuery({
    queryKey: ["kds-my-item-assignments", employeeId],
    queryFn: () => base44.entities.KitchenItemAssignment.filter({ employee_id: employeeId }, "-created_date", 500),
    enabled: mineEnabled,
  });

  const myAssignments = assignments.data || EMPTY;
  const eventIds = [...new Set([
    ...(batchEvents.data?.items || []),
    ...myAssignments.map((a) => a.event_id),
  ].filter(Boolean))];

  return {
    ready: !loading && (!restricted || (mineEnabled && !batchEvents.isLoading && !assignments.isLoading)),
    restricted,
    unlinked: restricted && !employeeId,
    employeeId,
    eventIds,
    myAssignments,
  };
}