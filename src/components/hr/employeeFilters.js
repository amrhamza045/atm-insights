export const EMPTY_FILTERS = {
  search: "", department: "all", role: "all", employment_type: "all",
  salary_type: "all", access: "all", hireFrom: "", hireTo: "",
};

export const GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "department", label: "Department" },
  { value: "role", label: "Role" },
  { value: "employment_type", label: "Employment type" },
  { value: "salary_type", label: "Salary type" },
  { value: "access", label: "Access status" },
  { value: "branch", label: "Branch" },
  { value: "hire_year", label: "Hire year" },
];

/** registered | invited | none — from server access info + invite timestamp. */
export function accessState(employee, isRegistered) {
  if (isRegistered(employee)) return "registered";
  if (employee.invite_sent_at) return "invited";
  return "none";
}

export function activeFilterCount(f) {
  // The search box sits outside the Filter panel, so it isn't counted on the Filter button.
  return Object.keys(EMPTY_FILTERS).filter((k) => k !== "search" && f[k] !== EMPTY_FILTERS[k]).length;
}

export function applyFilters(list, f, { roleFor, isRegistered }) {
  const q = f.search.trim().toLowerCase();
  return list.filter((e) => {
    if (q && ![
      e.name, e.employee_id, e.email, e.phone, e.position, e.department, roleFor(e),
      e.employment_type, e.branch_name, e.hire_date, e.fixed_salary, e.hourly_rate,
    ].some((v) => String(v ?? "").toLowerCase().includes(q))) return false;
    if (f.department !== "all" && (e.department || "") !== f.department) return false;
    if (f.role !== "all" && (roleFor(e) || "") !== f.role) return false;
    if (f.employment_type !== "all" && (e.employment_type || "regular") !== f.employment_type) return false;
    if (f.salary_type !== "all" && e.salary_type !== f.salary_type) return false;
    if (f.access !== "all" && accessState(e, isRegistered) !== f.access) return false;
    if (f.hireFrom && (!e.hire_date || e.hire_date < f.hireFrom)) return false;
    if (f.hireTo && (!e.hire_date || e.hire_date > f.hireTo)) return false;
    return true;
  });
}

const ACCESS_LABEL = { registered: "Registered", invited: "Invited — pending", none: "No access" };

function groupLabel(e, groupBy, { roleFor, isRegistered }) {
  switch (groupBy) {
    case "department": return e.department || "No department";
    case "role": return roleFor(e) || "No role";
    case "employment_type": return e.employment_type || "regular";
    case "salary_type": return e.salary_type || "—";
    case "access": return ACCESS_LABEL[accessState(e, isRegistered)];
    case "branch": return e.branch_name || "No branch";
    case "hire_year": return e.hire_date ? e.hire_date.slice(0, 4) : "No hire date";
    default: return "";
  }
}

/** Returns [{ label, items }] — a single unlabeled group when not grouping. */
export function groupEmployees(list, groupBy, helpers) {
  if (groupBy === "none") return [{ label: "", items: list }];
  const map = new Map();
  list.forEach((e) => {
    const k = groupLabel(e, groupBy, helpers);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(e);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({ label, items }));
}