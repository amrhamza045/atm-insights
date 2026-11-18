// What the audit log records from screens. Only records people change by hand
// are listed; records the app recalculates by itself (event totals, orders,
// reservations) are left out so the audit log stays readable.
//   auto:    fields the app keeps up to date by itself. A save made only of these
//            (stock levels after a sale, supplier ratings, table status) is not logged.
//   private: logs which fields changed, never their values (pay amounts).
export const AUDITED = {
  // Money & access
  BalanceRecharge: "Balance top-up",
  ReferralCommission: "Referral commission",
  UserPermissions: "User permission overrides",
  Role: "Role",
  // Stock & purchasing
  PurchaseOrder: "Purchase order",
  PurchaseInvoice: "Supplier invoice",
  WasteDeclaration: "Waste declaration",
  ExpiryReport: "Expiry report",
  Supplier: { label: "Supplier", auto: ["rating", "quality_rating", "delivery_performance", "total_orders", "total_spent", "total_outstanding"] },
  InventoryItem: { label: "Stock item", auto: ["quantity"] },
  Return: "Return",
  // HR
  Employee: "Employee",
  ExEmployee: "Ex-employee record",
  Department: "Department",
  Shift: "Shift",
  Attendance: "Attendance",
  SalaryPenalty: "Salary penalty",
  EmployeeBorrowing: "Employee advance",
  SalaryRecord: "Salary record",
  AttendancePolicy: "Attendance policy",
  DisciplinaryAction: "Disciplinary action",
  Payslip: { label: "Payslip", private: true },
  PayrollDisbursement: { label: "Payroll payout", private: true },
  PayrollSettings: "Payroll settings",
  // Settings
  Branch: "Branch",
  ScheduleSettings: "Schedule settings",
  EmailNotificationSettings: "Email settings",
  SystemSettings: "System settings",
  RestaurantInfo: "Restaurant info / branding",
  RestaurantLocation: "Restaurant location",
  ReportRecipientSettings: "Report recipients",
  SocialMediaConnection: "Social media connection",
  DeliveryZone: "Delivery zone",
  DeliveryCompany: "Delivery company",
  DeliveryPerson: "Delivery person",
  DeliveryBonusTier: "Delivery bonus tier",
  PreparationArea: "Preparation area",
  Printer: "Printer",
  Table: { label: "Table", auto: ["status", "current_order_id", "merged_with"] },
  InventoryCategory: "Stock category",
  StorageLocation: "Storage location",
  UnitDefinition: "Unit",
  UnitConversionRule: "Unit conversion",
  CashbackRule: "Cashback rule",
  CashbackTier: "Cashback tier",
  LoyaltyTier: "Loyalty tier",
  RegistrationLevel: "Registration level",
  ReferralMilestone: "Referral milestone",
  Reward: "Reward",
  RewardCategory: "Reward category",
  // Catering settings
  CateringSettings: "Catering settings",
  CateringCancellationPolicy: "Cancellation policy",
  CateringPaymentPolicy: "Payment policy",
  CateringCostBudget: "Event cost budget",
  CateringStaffingRole: "Staffing role",
  CateringVehicle: "Vehicle",
  CateringOption: "Catering list option",
  CateringEquipmentCategory: "Equipment category",
  CateringEventTypeDiscount: "Event type discount",
  CateringPassBranding: "Event pass branding",
  CateringProcurementSettings: "Procurement settings",
  CateringMediaVendor: "Media vendor",
};

// Bulk edits and bulk deletes are always deliberate, so they are logged for every
// record type, except these background syncs the app runs by itself.
const BULK_UNLOGGED = new Set(["AuditLog", "CateringAssignment", "CateringReservation"]);

const words = (s) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ ([A-Z])/g, (_, c) => ` ${c.toLowerCase()}`);

/** null = not logged; full = creates, edits and deletes too, not just bulk changes. */
export function auditConfig(entity) {
  const c = AUDITED[entity];
  if (c) return typeof c === "string" ? { label: c, auto: [], full: true } : { auto: [], ...c, full: true };
  return BULK_UNLOGGED.has(entity) ? null : { label: words(entity), auto: [], full: false };
}

const NAME_FIELDS = ["name", "order_number", "invoice_number", "employee_name", "item_name", "client_name", "title", "level_name", "setting_key", "event_name",
  "role_label", "tier_name", "display_name", "location_name", "account_name", "table_number", "order_reference", "event_type", "inventory_item_name"];

export function nameOf(r) {
  const v = r && NAME_FIELDS.map((f) => r[f]).find(Boolean);
  return v ? String(v) : null;
}