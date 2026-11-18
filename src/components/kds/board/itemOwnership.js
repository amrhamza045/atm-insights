// Which quote lines belong to a kitchen staff member: a prep batch they're on,
// or a menu item assigned to them directly (no batch). Shared by the Head Chef
// board and the Kitchen Display so both read assignments the same way.
const norm = (s) => (s || "").trim().toLowerCase();

export const itemKey = (line) => line.menu_item_id || line.name;

export const batchMatchesLine = (batch, line) =>
  (line.menu_item_id && batch.output_item_id === line.menu_item_id) ||
  [batch.recipe_name, batch.output_item_name].some((n) => n && norm(n) === norm(line.name));

// myBatches: batches the person is assigned to; myAssignments: their direct item assignments.
export const ownsLine = (line, eventId, myBatches, myAssignments) =>
  myBatches.some((b) => b.catering_event_id === eventId && batchMatchesLine(b, line)) ||
  myAssignments.some((a) => a.event_id === eventId && a.item_key === itemKey(line));