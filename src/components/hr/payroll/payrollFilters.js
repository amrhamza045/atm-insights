export const EMPTY_PAY_FILTERS = {
  search: "", payStatus: "all", department: "all", position: "all", salaryType: "all",
  deductions: "all", minNet: "", maxNet: "",
};

export const PAY_GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "department", label: "Department" },
  { value: "position", label: "Position" },
  { value: "status", label: "Payment status" },
  { value: "salaryType", label: "Salary type" },
  { value: "branch", label: "Branch" },
];

export function activePayCount(f) {
  return Object.keys(EMPTY_PAY_FILTERS).filter((k) => f[k] !== EMPTY_PAY_FILTERS[k]).length;
}

const statusOf = (rec) => rec?.payment_status || "not run";

export function filterPayroll(rows, f) {
  const q = f.search.trim().toLowerCase();
  return rows.filter(({ emp, rec }) => {
    if (q && ![emp.name, emp.position].some((v) => (v || "").toLowerCase().includes(q))) return false;
    if (f.payStatus !== "all" && statusOf(rec) !== f.payStatus) return false;
    if (f.department !== "all" && emp.department !== f.department) return false;
    if (f.position !== "all" && emp.position !== f.position) return false;
    if (f.salaryType !== "all" && emp.salary_type !== f.salaryType) return false;
    if (f.deductions === "penalties" && !(rec?.penalty_deductions > 0)) return false;
    if (f.deductions === "borrowing" && !(rec?.borrowing_deductions > 0)) return false;
    if (f.deductions === "bonus" && !(rec?.bonus > 0)) return false;
    if (f.minNet !== "" && !(rec && rec.net_salary >= Number(f.minNet))) return false;
    if (f.maxNet !== "" && !(rec && rec.net_salary <= Number(f.maxNet))) return false;
    return true;
  });
}

export function groupPayroll(rows, by) {
  if (by === "none") return [{ label: "", items: rows, net: 0 }];
  const key = {
    department: ({ emp }) => emp.department || "No department",
    position: ({ emp }) => emp.position || "No position",
    status: ({ rec }) => statusOf(rec),
    salaryType: ({ emp }) => emp.salary_type || "Not set",
    branch: ({ emp }) => emp.branch_name || "No branch",
  }[by];
  const map = new Map();
  rows.forEach((r) => {
    const k = key(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({
    label, items, net: items.reduce((s, r) => s + (r.rec?.net_salary || 0), 0),
  }));
}