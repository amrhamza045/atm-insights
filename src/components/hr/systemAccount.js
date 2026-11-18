// System-account HR records exist only so an account can hold a role.
// They never count as staff for payroll, attendance, labor cost or staffing.
export const isSystemAccount = (employee) => employee?.employment_type === "system_account";
export const excludeSystemAccounts = (list = []) => list.filter((e) => !isSystemAccount(e));