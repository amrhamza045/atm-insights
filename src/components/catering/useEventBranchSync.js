import { useEffect, useRef } from "react";
import { useBranch } from "@/components/branches/BranchContext";

/**
 * Keeps the open event and the branch picked at the top together, so every
 * event tab works in the event's own branch. Opening an event of another
 * branch moves the picker to that branch; picking another branch while an
 * event is open closes the event. An event in a branch this account can't
 * pick is closed.
 */
export default function useEventBranchSync(event, closeEvent) {
  const { branches, selectedBranchId, selectBranch } = useBranch();
  const seen = useRef(null); // the event and branch last seen together

  useEffect(() => {
    if (!event?.branch_id || !selectedBranchId) return;
    const last = seen.current;
    seen.current = { eventId: event.id, branchId: selectedBranchId };
    if (event.branch_id === selectedBranchId) return;
    const pickerMoved = last?.eventId === event.id && last.branchId !== selectedBranchId;
    if (pickerMoved || !branches.some((b) => b.id === event.branch_id)) closeEvent();
    else selectBranch(event.branch_id);
  }, [event?.id, event?.branch_id, selectedBranchId]);
}