// Role names and labels are NOT listed here — they come live from the Role
// entity via useRoleOptions / useRoleLabels. Only the user-type filter, which
// isn't role data, is a fixed list.
export const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "employees", label: "Employees" },
  { value: "ex_employees", label: "Ex Employees" },
  { value: "users", label: "Regular Users" },
];