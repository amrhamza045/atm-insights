// Sum of guest counts across distinct package tags ("Name · 200 pax"); 0 when no packages.
export function packagePaxTotal(lines = []) {
  const seen = new Map();
  lines.forEach((l) => {
    const m = /·\s*(\d+(?:\.\d+)?)\s*(?:pax|persons)\s*$/.exec(l?.description || "");
    if (m) seen.set(l.description, Number(m[1]));
  });
  return [...seen.values()].reduce((s, n) => s + n, 0);
}

// Replaces each package's recipe lines with one line showing the package name
// and guest count ("Name · 200 pax") at the package's total. Untagged lines stay.
export function collapsePackageLines(lines = []) {
  const out = [];
  const byLabel = new Map();
  lines.forEach((l) => {
    const label = l.description || "";
    if (!label) return out.push(l);
    let row = byLabel.get(label);
    if (!row) {
      row = { name: label, quantity: 1, unit_price: 0, line_total: 0 };
      byLabel.set(label, row);
      out.push(row);
    }
    row.line_total += Number(l.line_total) || 0;
    row.unit_price = row.line_total;
  });
  return out;
}

// Inserts a package header row before each run of lines tagged with the same
// package (line.description) and a subtotal row after it, mirroring the
// quote editor's grouped sections.
export function withGroupHeaders(lines) {
  const out = [];
  let prev = "";
  let sum = 0;
  const close = () => { if (prev) out.push({ subtotal: sum }); };
  lines.forEach((l) => {
    const label = l.description || "";
    if (label !== prev) {
      close();
      if (label) out.push({ header: label });
      sum = 0;
    }
    prev = label;
    sum += Number(l.line_total) || 0;
    out.push(l);
  });
  close();
  return out;
}