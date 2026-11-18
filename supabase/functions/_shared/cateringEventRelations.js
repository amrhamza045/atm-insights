export const EVENT_RELATIONS = [
  { entity: "CateringActualCostRun", field: "event_id", label: "Actual cost runs" },
  { entity: "CateringAssignment", field: "event_id", label: "Staff assignments" },
  { entity: "CateringCustodyCheckpoint", field: "event_id", label: "Custody checkpoints" },
  { entity: "CateringEquipmentMaintenance", field: "event_id", label: "Equipment maintenance records" },
  { entity: "CateringEquipmentReservation", field: "event_id", label: "Equipment reservations" },
  { entity: "CateringInvitation", field: "event_id", label: "Guest invitations" },
  { entity: "CateringPayment", field: "event_id", label: "Payments" },
  { entity: "CateringPortalQuoteOverride", field: "event_id", label: "Portal quote overrides" },
  { entity: "CateringQuote", field: "event_id", label: "Quotes" },
  { entity: "CateringReconciliation", field: "event_id", label: "Reconciliations" },
  { entity: "CateringReservation", field: "event_id", label: "Stock reservations" },
  { entity: "CateringReturnedItem", field: "event_id", label: "Returned items" },
  { entity: "CateringStaffFeedback", field: "event_id", label: "Staff feedback" },
  { entity: "CateringTransferProof", field: "event_id", label: "Transfer proofs" },
  { entity: "CateringTrip", field: "event_id", label: "Trips" },
  { entity: "WasteDeclaration", field: "event_id", label: "Waste declarations" },
  { entity: "KitchenReleaseSlip", field: "event_id", label: "Kitchen release slips" },
  { entity: "PurchaseOrder", field: "catering_event_id", label: "Purchase orders" },
  { entity: "ProductionOrder", field: "catering_event_id", label: "Production orders" },
  { entity: "Shift", field: "catering_event_id", label: "Catering shifts" },
  { entity: "JournalEntry", field: "catering_event_id", label: "Ledger entries", cascade: false },
];

const uniqueRows = (rows) => [...new Map(rows.map((row) => [row.id, row])).values()];

export async function loadEventRelations(client, eventId) {
  const result = {};
  for (const relation of EVENT_RELATIONS) {
    let rows = await client.entities[relation.entity].filter({ [relation.field]: eventId }, "-created_date", 5000);
    if (relation.entity === "PurchaseOrder") {
      const orders = await client.entities.PurchaseOrder.list("-created_date", 5000);
      rows = uniqueRows([...rows, ...orders.filter((order) => (order.catering_event_ids || []).includes(eventId))]);
    }
    result[relation.entity] = rows;
  }
  return result;
}

export function buildDeletionCensus(children) {
  const completedPayments = children.CateringPayment.filter((row) => row.status === "completed");
  const liveQuotes = children.CateringQuote.filter((row) => ["active", "accepted"].includes(row.status));
  const committedReservations = children.CateringReservation.filter((row) => ["reserved", "consumed"].includes(row.status));
  const committedEquipment = children.CateringEquipmentReservation.filter((row) => ["reserved", "dispatched", "returned"].includes(row.status));
  const committedProduction = children.ProductionOrder.filter((row) => ["pending", "in_progress", "completed"].includes(row.status));
  const sharedOrders = children.PurchaseOrder.filter((row) => (row.catering_event_ids || []).filter(Boolean).length > 1);
  // Issued stock: released/received batch slips and fulfilled legacy slips are the record that stock left inventory.
  const issuedSlips = children.KitchenReleaseSlip.filter((row) => ["released", "received", "fulfilled"].includes(row.status));
  const blockers = [];
  if (issuedSlips.length) blockers.push("This event has issued stock and can't be deleted.");
  if (completedPayments.length) {
    const total = completedPayments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    blockers.push(`This event has ${completedPayments.length} completed payment(s) totaling ${total.toLocaleString("en-US")} EGP — use Cancel instead.`);
  }
  if (liveQuotes.length) blockers.push(`This event has ${liveQuotes.length} active or accepted quote(s) — use Cancel instead.`);
  if (committedReservations.length) blockers.push(`This event has ${committedReservations.length} committed stock reservation(s) — use Cancel to release them safely.`);
  if (committedEquipment.length) blockers.push(`This event has ${committedEquipment.length} committed equipment reservation(s) — use Cancel to release them safely.`);
  if (committedProduction.length) blockers.push(`This event has ${committedProduction.length} committed production order(s) — use Cancel to release them safely.`);
  if (children.JournalEntry.length) blockers.push(`This event has ${children.JournalEntry.length} ledger entry or entries. Original postings are never deleted; use Cancel and record any required reversal.`);
  if (sharedOrders.length) blockers.push(`This event is linked to ${sharedOrders.length} purchase order(s) shared with other events, so it cannot be cascade-deleted.`);
  const items = EVENT_RELATIONS.filter((relation) => relation.cascade !== false && children[relation.entity].length).map((relation) => ({
    entity: relation.entity,
    label: relation.label,
    count: children[relation.entity].length,
    ids: children[relation.entity].map((row) => row.id),
  }));
  return { canDelete: blockers.length === 0, blockers, items, totalChildren: items.reduce((sum, item) => sum + item.count, 0) };
}

export async function scanCateringOrphans(client) {
  const events = await client.entities.CateringEvent.list("-created_date", 5000);
  const eventIds = new Set(events.map((event) => event.id));
  const results = [];
  for (const relation of EVENT_RELATIONS) {
    const rows = await client.entities[relation.entity].list("-created_date", 5000);
    const records = rows.map((row) => {
      const references = relation.entity === "PurchaseOrder"
        ? [...new Set([row.catering_event_id, ...(row.catering_event_ids || [])].filter(Boolean))]
        : [row[relation.field]].filter(Boolean);
      const missingEventIds = references.filter((id) => !eventIds.has(id));
      return missingEventIds.length ? { id: row.id, missing_event_ids: missingEventIds } : null;
    }).filter(Boolean);
    results.push({ entity: relation.entity, label: relation.label, count: records.length, records });
  }
  return { scanned_at: new Date().toISOString(), event_count: events.length, total_orphans: results.reduce((sum, row) => sum + row.count, 0), entities: results };
}