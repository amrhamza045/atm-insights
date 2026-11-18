export const EMPTY_BOR_FILTERS = {
  search: "", status: "all", repayment: "all", balance: "all",
  minAmount: "", maxAmount: "", borrowFrom: "", borrowTo: "",
};

export const BOR_GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "employee", label: "Employee" },
  { value: "status", label: "Status" },
  { value: "repayment", label: "Repayment type" },
  { value: "month", label: "Borrow month" },
];

export function activeBorCount(f) {
  return Object.keys(EMPTY_BOR_FILTERS).filter((k) => f[k] !== EMPTY_BOR_FILTERS[k]).length;
}

export function filterBorrowings(list, f) {
  const q = f.search.trim().toLowerCase();
  return list.filter((b) => {
    if (q && ![b.employee_name, b.reason].some((v) => (v || "").toLowerCase().includes(q))) return false;
    if (f.status !== "all" && b.status !== f.status) return false;
    if (f.repayment !== "all" && (b.repayment_type || "installments") !== f.repayment) return false;
    if (f.balance === "outstanding" && !(b.remaining_balance > 0)) return false;
    if (f.balance === "cleared" && b.remaining_balance > 0) return false;
    if (f.minAmount !== "" && !(b.amount >= Number(f.minAmount))) return false;
    if (f.maxAmount !== "" && !(b.amount <= Number(f.maxAmount))) return false;
    if (f.borrowFrom && (!b.borrow_date || b.borrow_date < f.borrowFrom)) return false;
    if (f.borrowTo && (!b.borrow_date || b.borrow_date > f.borrowTo)) return false;
    return true;
  });
}

export function groupBorrowings(list, by) {
  if (by === "none") return [{ label: "", items: list, total: 0, remaining: 0 }];
  const key = {
    employee: (b) => b.employee_name || "Unknown",
    status: (b) => b.status || "—",
    repayment: (b) => (b.repayment_type === "lump_sum" ? "Lump sum" : "Monthly installments"),
    month: (b) => b.borrow_date?.slice(0, 7) || "No date",
  }[by];
  const map = new Map();
  list.forEach((b) => {
    const k = key(b);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(b);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({
    label, items,
    total: items.reduce((s, b) => s + (b.amount || 0), 0),
    remaining: items.reduce((s, b) => s + (b.remaining_balance || 0), 0),
  }));
}