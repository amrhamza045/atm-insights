import React from "react";

export default function DeleteEventCensus({ loading, error, census }) {
  if (loading) return <p className="text-sm text-muted-foreground">Checking linked records…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!census) return null;
  if (!census.canDelete) return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-semibold">Deletion blocked</p>
      <ul className="list-disc space-y-1 pl-5">{census.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <p>Close this dialog and use the event’s Cancel action instead.</p>
    </div>
  );
  return (
    <div className="space-y-2 text-sm">
      <p>This clean event can be permanently deleted. The following linked records will also be removed:</p>
      {census.items.length ? <ul className="list-disc pl-5">{census.items.map((item) => <li key={item.entity}>{item.label}: {item.count}</li>)}</ul> : <p className="text-muted-foreground">No linked child records were found.</p>}
    </div>
  );
}