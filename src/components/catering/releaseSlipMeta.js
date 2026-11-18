export const releaseSlipMeta = {
  open: { label: "Open", className: "bg-amber-100 text-amber-800" },
  scheduled: { label: "Scheduled", className: "bg-sky-100 text-sky-800" },
  released: { label: "Released", className: "bg-emerald-100 text-emerald-800" },
  received: { label: "Received", className: "bg-emerald-200 text-emerald-900" },
  fulfilled: { label: "Fulfilled", className: "bg-emerald-100 text-emerald-800" },
  void: { label: "Void", className: "bg-slate-200 text-slate-700" },
};

export const getReleaseSlipMeta = (status) => releaseSlipMeta[status] || releaseSlipMeta.open;

/** Requisition batch slip (several per event, released through the requisition flow — never the legacy fulfil). */
export const isBatchSlip = (slip) => !!(slip?.requisition_id || slip?.is_requisition_batch);
/** "REQ-XXXX · Batch 2" for a batch slip, null for a legacy slip. */
export const batchLabel = (slip) => (isBatchSlip(slip) ? `${slip.requisition_number || "Requisition"} · Batch ${slip.batch_number ?? "?"}` : null);

export function currentFreeStock(line, inventory, reservations, eventId) {
  const item = inventory.find((row) => row.id === line.inventory_item_id);
  const committedElsewhere = reservations
    .filter((row) => row.inventory_item_id === line.inventory_item_id && row.event_id !== eventId)
    .reduce((sum, row) => sum + (Number(row.quantity_reserved) || 0), 0);
  return Math.max(0, Math.round(((Number(item?.quantity) || 0) - committedElsewhere) * 100) / 100);
}