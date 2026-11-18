import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Every batch plan write goes through the backend function; batch slips refuse direct client writes.
export const planBatches = (payload) => base44.functions.invoke("planRequisitionBatches", payload);

const round = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

/** Lines a batch plan covers: active, agreed, agreed quantity above 0 (declined lines excluded). */
export const plannableLines = (lines) => lines.filter((l) => l.is_active !== false && l.is_agreed === true && Number(l.agreed_quantity) > 0);

/** The plan in force, from the requisition's non-void batch slips (same shape the server stores). */
export const planOfSlips = (slips) => slips.filter((s) => s.status !== "void")
  .sort((a, b) => (a.batch_number || 0) - (b.batch_number || 0))
  .map((s) => ({
    batch_number: s.batch_number, slip_id: s.id, slip_number: s.slip_number, needed_by_date: s.needed_by_date, status: s.status,
    released_by: s.fulfilled_by, released_date: s.fulfilled_date, received_by: s.received_by_name || s.received_by, received_date: s.received_date,
    receipt_comment: s.receipt_comment,
    lines: (s.lines || []).map((l) => ({
      line_id: l.requisition_line_id, reservation_id: l.reservation_id, inventory_item_name: l.inventory_item_name, unit: l.unit,
      quantity: Number(l.quantity_reserved) || 0, actual_quantity: l.actual_quantity,
    })),
  }));

/** Released batches are locked; a proposal only covers the scheduled ones. */
export const isReleasedBatch = (b) => b.status === "released" || b.status === "received";

/** Lines with their agreed quantity reduced by what released batches already took (what a new plan must place). */
export function unreleasedLines(lines, plan) {
  const done = new Map();
  plan.filter(isReleasedBatch).forEach((b) => b.lines.forEach((x) => done.set(x.line_id, round((done.get(x.line_id) || 0) + x.quantity))));
  return plannableLines(lines)
    .map((l) => ({ ...l, agreed_quantity: round(Number(l.agreed_quantity) - (done.get(l.id) || 0)) }))
    .filter((l) => l.agreed_quantity > 0);
}

/** Quantity of each line still to place: agreed minus what the draft batches already hold. */
export function remainingByLine(lines, draft) {
  const placed = new Map();
  draft.forEach((b) => Object.entries(b.qty).forEach(([id, v]) => placed.set(id, round((placed.get(id) || 0) + (Number(v) || 0)))));
  return new Map(lines.map((l) => [l.id, round(Number(l.agreed_quantity) - (placed.get(l.id) || 0))]));
}

/** Max quantity a batch can hold for a line: agreed quantity minus what the other draft batches hold. */
export function maxForBatchLine(line, draft, batchKey) {
  const other = draft
    .filter((b) => b.key !== batchKey)
    .reduce((sum, b) => sum + (Number(b.qty[line.id]) || 0), 0);
  return Math.max(0, round(Number(line.agreed_quantity) - other));
}

/** Clamp an entered batch quantity to 0 … maxForBatchLine. */
export function clampBatchQty(raw, max) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n > max) return String(max);
  return String(raw);
}

/** Editor draft ↔ server payload. */
export const draftOf = (plan) => plan.map((b, i) => ({
  key: b.slip_id || `n${i}`, slip_id: b.slip_id || null, batch_number: b.batch_number ?? null, needed_by_date: b.needed_by_date || "",
  qty: Object.fromEntries(b.lines.map((x) => [x.line_id, String(x.quantity)])),
}));
export const payloadOf = (draft) => draft.map((b) => ({
  slip_id: b.slip_id, needed_by_date: b.needed_by_date,
  lines: Object.entries(b.qty).filter(([, v]) => Number(v) > 0).map(([line_id, v]) => ({ line_id, quantity: Number(v) })),
}));

/** The requisition's batch slips, re-read whenever the polled requisition record changes. */
export function useBatchSlips(requisition) {
  return useQuery({
    queryKey: ["requisition", requisition?.id, "batches", requisition?.updated_date],
    queryFn: () => base44.entities.KitchenReleaseSlip.filter({ requisition_id: requisition.id }, "batch_number", 100),
    enabled: !!requisition?.id,
  });
}