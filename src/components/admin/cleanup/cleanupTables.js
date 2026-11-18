// Settings, configuration, catalog and access tables. They are listed and can be
// selected, but they are never pre-selected and are flagged in the review step.
export const KEEP_TABLES = new Set([
  "SystemSettings", "CateringSettings", "CateringProcurementSettings", "PayrollSettings", "ScheduleSettings",
  "EmailNotificationSettings", "ReportRecipientSettings", "RestaurantInfo", "RestaurantLocation", "Branch",
  "Role", "UserPermissions", "Department", "Shift", "AttendancePolicy", "BorrowingPolicy",
  "CashbackTier", "CashbackRule", "LoyaltyTier", "Reward", "RewardCategory", "ReferralMilestone", "RegistrationLevel",
  "DeliveryBonusTier", "MenuItem", "MenuCategory", "MenuSection", "MenuOption", "MenuItemOption",
  "InventoryItem", "InventoryCategory", "Recipe", "StorageLocation", "PreparationArea", "Printer", "Table",
  "Supplier", "ButcherySupplier", "DeliveryCompany", "DeliveryZone", "CateringPackage", "CateringOption",
  "CateringStaffingRole", "CateringCancellationPolicy", "CateringEventTypeDiscount", "CateringEquipment",
  "CateringEquipmentUnit", "CateringVehicle", "CateringPassBranding", "CateringMediaVendor",
  "FinanceCompany", "FinanceAccount", "FinanceTaxConfig", "FinanceTaxRule", "FinanceVarianceAlertConfig", "GLAccount",
  "UiTranslation", "KitchenManual", "VeraKit360ManualSection", "VendorSupportInfo", "SocialMediaConnection",
  "LeadSourceMapping", "SMSNotificationPreferences", "UserNotificationPreferences",
]);

// Tables whose removal affects who can sign in to what.
export const ACCESS_TABLES = new Set(["Role", "UserPermissions", "Employee", "DeliveryPerson", "Client"]);

export const splitWords = (name) => name.replace(/([a-z])([A-Z])/g, "$1 $2");