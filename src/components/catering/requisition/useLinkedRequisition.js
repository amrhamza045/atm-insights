import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Requisition id from a notification link (?requisition=…). Calls onLinked on every visit to such a link. */
export function useLinkedRequisition(onLinked, ready = true) {
  const location = useLocation();
  const id = new URLSearchParams(location.search).get("requisition");
  useEffect(() => {
    if (id && ready) onLinked(id);
    // location.key: clicking the same notification again re-opens it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ready, location.key]);
  return id;
}