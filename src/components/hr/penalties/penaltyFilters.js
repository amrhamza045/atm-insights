export const EMPTY_PEN_FILTERS = {
  search: "", type: "all", status: "all", minAmount: "", maxAmount: "", incidentFrom: "", incidentTo: "",
};

export const PEN_GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "employee", label: "Employee" },
  { value: "type", label: "Penalty type" },
  { value: "status", label: "Status" },
  { value: "month", label: "Apply-to month" },
];

export function activePenCount(f) {
  return Object.keys(EMPTY_PEN_FILTERS).filter((k) => f[k] !== EMPTY_PEN_FILTERS[k]).length;
}

export function filterPenalties(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((p) => {
    if (q && ![p.employee_name, p.description].some((v) => (v || "").toLowerCase().includes(q))) return false;
    if (f.type !== "all" && p.penalty_type !== f.type) return false;
    if (f.status !== "all" && p.status !== f.status) return false;
    if (f.minAmount !== "" && !(p.amount >= Number(f.minAmount))) return false;
    if (f.maxAmount !== "" && !(p.amount <= Number(f.maxAmount))) return false;
    if (f.incidentFrom && (!p.incident_date || p.incident_date < f.incidentFrom)) return false;
    if (f.incidentTo && (!p.incident_date || p.incident_date > f.incidentTo)) return false;
    return true;
  });
}

export function groupPenalties(list, by, typeLabel) {
  if (by === "none") return [{ label: "", items: list, total: 0 }];
  const key = {
    employee: (p) => p.employee_name || "Unknown",
    type: (p) => typeLabel(p.penalty_type),
    status: (p) => p.status || "—",
    month: (p) => p.apply_to_month?.slice(0, 7) || "No month",
  }[by];
  const map = new Map();
  list.forEach((p) => {
    const k = key(p);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({
    label, items, total: items.reduce((s, p) => s + (p.amount || 0), 0),
  }));
}