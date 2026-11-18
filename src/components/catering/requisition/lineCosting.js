/** An extra line whose item cost is 0 (also extras saved before zero cost counted as uncosted). */
export const isZeroCost = (line) =>
  line.line_type === "extra" &&
  (line.uncosted_reason === "The inventory item cost is 0" || (line.estimated_cost_status === "costed" && Number(line.estimated_unit_cost) === 0));

/** A requisition line with no comparable cost. Older lines predate estimated_cost_status: a null unit cost meant uncosted. */
export const isUncosted = (line) =>
  isZeroCost(line) || (line.estimated_cost_status ? line.estimated_cost_status === "uncosted" : line.estimated_unit_cost == null);

/** Badge text for an uncosted line. */
export const uncostedLabel = (line) => (isZeroCost(line) ? "Uncosted (cost is 0)" : "Uncosted");