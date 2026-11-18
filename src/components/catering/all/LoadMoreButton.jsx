import React from "react";
import { Button } from "@/components/ui/button";

/** "Load more" for an all-events list; hidden once everything is shown. */
export default function LoadMoreButton({ list }) {
  if (!list.hasMore) return null;
  return (
    <div className="flex justify-center">
      <Button variant="outline" size="sm" onClick={list.loadMore} disabled={list.loadingMore}>
        {list.loadingMore ? "Loading…" : "Load more"}
      </Button>
    </div>
  );
}