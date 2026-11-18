// Automatic, incremental unit IDs for catering equipment pieces.

export function unitPrefix(name = "") {
  const words = String(name).replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).filter(Boolean);
  const raw = words.map((w) => w.slice(0, 3)).join("").toUpperCase();
  return (raw || "EQP").slice(0, 6);
}

// Highest number already used for this prefix, so new IDs continue the sequence.
export function highestUnitNumber(existingCodes = [], prefix = "") {
  let max = 0;
  existingCodes.forEach((code) => {
    const m = String(code || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}

// Builds `count` unit rows with automatic incremental codes (PREFIX-001, PREFIX-002 …)
export function buildUnitRows(item, count, { existingCodes = [], purchaseDate = "" } = {}) {
  const prefix = unitPrefix(item.name);
  const taken = new Set(existingCodes);
  let n = highestUnitNumber(existingCodes, prefix);
  const rows = [];
  while (rows.length < count) {
    n += 1;
    const unit_code = `${prefix}-${String(n).padStart(3, "0")}`;
    if (taken.has(unit_code)) continue;
    rows.push({
      equipment_id: item.id,
      equipment_name: item.name,
      unit_code,
      status: "available",
      current_location_type: "branch",
      current_location_name: item.home_branch_name || item.storage_location || "",
      ...(purchaseDate ? { purchase_date: purchaseDate } : {}),
    });
  }
  return rows;
}