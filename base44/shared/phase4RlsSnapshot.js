/**
 * SNAPSHOT (reference only — not imported anywhere) of the data rules on every
 * Phase 4 entity BEFORE Phase 4, taken 2026-09-28. Rollback version: 9a59faf.
 * null = the entity had NO rules (open to every signed-in user).
 * To roll back one entity: set its "rls" back to the block below (or remove "rls" when null).
 * Employee field values moved to EmployeePrivate are kept in PHASE4_EMPLOYEE_VALUES_FILE.
 */
const ADMIN = { user_condition: { role: 'admin' } };

export const PHASE4_RLS_BEFORE = {
  UserPermissions: {
    read: { $or: [{ 'data.user_email': '{{user.email}}' }, ADMIN] },
    create: ADMIN, update: ADMIN, delete: ADMIN,
  },
  Role: {
    read: { $or: [ADMIN, { user_condition: { role: 'user' } }] },
    create: ADMIN, update: ADMIN, delete: ADMIN,
  },
  AuditLog: {
    read: ADMIN,
    create: { $or: [ADMIN, { user_condition: { role: 'user' } }] },
    update: ADMIN, delete: ADMIN,
  },
  SalaryRecord: { read: ADMIN, create: ADMIN, update: ADMIN, delete: ADMIN },
  SalaryPenalty: { read: ADMIN, create: ADMIN, update: ADMIN, delete: ADMIN },
  EmployeeBorrowing: { read: ADMIN, create: ADMIN, update: ADMIN, delete: ADMIN },
  DeliveryBonusRecord: { read: ADMIN, create: ADMIN, update: ADMIN, delete: ADMIN },
  Employee: null,
  Attendance: null,
  Shift: null,
  AttendancePolicy: null,
  DeliveryPerson: null,
  JournalEntry: null,
  GLAccount: null,
  Expense: null,
  DailyFinancialSummary: null,
  CashierSession: null,
  CashierPurchase: null,
  CateringPayment: null,
  Deposit: null,
  VisaCredit: null,
  BalanceRecharge: null,
  Purchase: null,
  ButcheryExpense: null,
  Payout: null,
  SystemSettings: { read: {}, create: ADMIN, update: ADMIN, delete: ADMIN },
  EmailNotificationSettings: { read: {}, create: ADMIN, update: ADMIN, delete: ADMIN },
};