/** Client mirror of the server reply rules (base44/shared/requisitionReply.js); the server re-checks everything. */
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export const agreedOf = (line, d) =>
  !d ? null : d.decision === "confirmed" ? Number(line.requested_quantity) || 0 : d.decision === "edited" ? round2(d.agreed_quantity) : null;

/** Inventory can't agree an extra line above the chef's requested quantity. */
export const isOverExtra = (line, d) =>
  line.line_type === "extra" && d?.decision === "edited" && round2(d.agreed_quantity) > round2(line.requested_quantity);

/** Whether an edited line has valid quantity and reason ready to be confirmed. */
export function canConfirmEdit(line, d) {
  if (!d || d.decision !== "edited") return false;
  const qty = Number(d.agreed_quantity);
  const reason = String(d.reason || "").trim();
  if (isOverExtra(line, d)) return false;
  return qty > 0 && round2(qty) !== round2(line.requested_quantity) && !!reason;
}

export function isComplete(line, d) {
  if (!d) return false;
  const reason = String(d.reason || "").trim();
  if (d.decision === "confirmed") return true;
  if (d.decision === "declined") return !!reason;
  if (d.decision === "edited") return canConfirmEdit(line, d) && d.edit_confirmed === true;
  return false;
}

/** Restore saved draft decisions from open lines (e.g. saved when a previous reply was blocked by stock shortages). */
export function savedDecisionsFromLines(openLines) {
  const map = {};
  for (const l of openLines) {
    if (l.inventory_decision && l.inventory_decision !== "pending") {
      map[l.id] = {
        decision: l.inventory_decision,
        agreed_quantity: l.agreed_quantity ?? "",
        reason: l.decision_reason || "",
        edit_confirmed: l.inventory_decision === "edited",
      };
    }
  }
  return map;
}

/** Line ids whose item's total agreed quantity in this reply exceeds its free stock. */
export function overStockLineIds(lines, decisions, free) {
  const need = new Map();
  lines.forEach((l) => {
    const q = agreedOf(l, decisions[l.id]);
    if (q) need.set(l.inventory_item_id, round2((need.get(l.inventory_item_id) || 0) + q));
  });
  return new Set(lines.filter((l) => agreedOf(l, decisions[l.id]) && need.get(l.inventory_item_id) > (free.get(l.inventory_item_id) ?? 0) + 1e-9).map((l) => l.id));
}

/** Per-item shortage summary for open lines whose confirmed/edited quantities exceed free stock. */
export function shortageItemsFromDecisions(lines, decisions, free) {
  const byItem = new Map();
  lines.forEach((l) => {
    const q = agreedOf(l, decisions[l.id]);
    if (!(q > 0) || !l.inventory_item_id) return;
    const prev = byItem.get(l.inventory_item_id) || {
      inventory_item_id: l.inventory_item_id,
      inventory_item_name: l.inventory_item_name || "",
      unit: l.unit || "",
      needed: 0,
      free: Math.max(0, round2(free.get(l.inventory_item_id) ?? 0)),
      raw_free: round2(free.get(l.inventory_item_id) ?? 0),
      reservation_ids: [],
    };
    prev.needed = round2(prev.needed + q);
    if (l.reservation_id) prev.reservation_ids.push(l.reservation_id);
    byItem.set(l.inventory_item_id, prev);
  });
  return [...byItem.values()]
    .filter((x) => x.needed > x.raw_free + 1e-9)
    .map((x) => ({
      ...x,
      shortfall: round2(x.needed - x.free),
    }));
}