export const EMPTY_ATT_FILTERS = {
  search: "", review: "all", status: "all", shift: "all",
  salary_type: "all", department: "all", position: "all", flag: "all",
};

export const ATT_GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "review", label: "Review status" },
  { value: "status", label: "Attendance status" },
  { value: "shift", label: "Shift" },
  { value: "salary_type", label: "Salary type" },
  { value: "department", label: "Department" },
  { value: "position", label: "Position" },
];

export function activeAttCount(f) {
  return Object.keys(EMPTY_ATT_FILTERS).filter((k) => f[k] !== EMPTY_ATT_FILTERS[k]).length;
}

const reviewOf = (r) => r.review_status || "pending";

export function filterRecords(list, f) {
  if (f.review === "no_checkin") return [];
  const q = f.search.trim().toLowerCase();
  return list.filter((r) => {
    if (q && !(r.employeeName || "").toLowerCase().includes(q)) return false;
    if (f.review !== "all" && reviewOf(r) !== f.review) return false;
    if (f.status !== "all" && (r.status || "present") !== f.status) return false;
    if (f.shift !== "all" && (r.assigned_shift_label || "") !== (f.shift === "none" ? "" : f.shift)) return false;
    if (f.salary_type !== "all" && r.salaryType !== f.salary_type) return false;
    if (f.department !== "all" && (r.department || "") !== f.department) return false;
    if (f.position !== "all" && (r.position || "") !== f.position) return false;
    if (f.flag === "late" && !(r.late_minutes > 0)) return false;
    if (f.flag === "overtime" && !(r.overtime_hours > 0)) return false;
    if (f.flag === "no_signout" && r.sign_out_time) return false;
    if (f.flag === "deduction" && !(r.deduction_amount > 0)) return false;
    return true;
  });
}

export function filterMissing(list, f) {
  if (!["all", "no_checkin"].includes(f.review)) return [];
  if (f.status !== "all" || f.shift !== "all" || f.flag !== "all") return [];
  const q = f.search.trim().toLowerCase();
  return list.filter((e) => {
    if (q && !(e.name || "").toLowerCase().includes(q)) return false;
    if (f.salary_type !== "all" && e.salary_type !== f.salary_type) return false;
    if (f.department !== "all" && (e.department || "") !== f.department) return false;
    if (f.position !== "all" && (e.position || "") !== f.position) return false;
    return true;
  });
}

function labelFor(r, by) {
  switch (by) {
    case "review": return reviewOf(r).replace(/^./, (c) => c.toUpperCase());
    case "status": return (r.status || "present").replace(/_/g, " ");
    case "shift": return r.assigned_shift_label || "No shift assigned";
    case "salary_type": return r.salaryType || "—";
    case "department": return r.department || "No department";
    case "position": return r.position || "No position";
    default: return "";
  }
}

export function groupRecords(list, by) {
  if (by === "none") return [{ label: "", items: list }];
  const map = new Map();
  list.forEach((r) => {
    const k = labelFor(r, by);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({ label, items }));
}