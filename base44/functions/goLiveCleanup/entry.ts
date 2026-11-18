import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { audit } from '../../shared/auditLog.js';

// Every app data table except the built-in User table (users can't be deleted here).
// Only names in this list can ever be counted or cleared.
const TABLES = ["Address", "Animal", "Attendance", "AttendancePolicy", "AuditLog", "BalanceRecharge", "BorrowingPolicy", "Branch", "ButcheryExpense", "ButcheryRawMaterial", "ButcherySupplier", "CampaignRecipient", "CashbackDistributionPending", "CashbackRule", "CashbackRuleHistory", "CashbackTier", "CashbackTransaction", "CashierPurchase", "CashierSession", "CateringActualCostRun", "CateringAssignment", "CateringCancellationPolicy", "CateringCostException", "CateringCustodyCheckpoint", "CateringEquipment", "CateringEquipmentMaintenance", "CateringEquipmentReservation", "CateringEquipmentUnit", "CateringEvent", "CateringEventTypeDiscount", "CateringInvitation", "CateringMediaVendor", "CateringOption", "CateringPackage", "CateringPassBranding", "CateringPayment", "CateringPaymentReviewLock", "CateringPortalAccess", "CateringPortalQuoteOverride", "CateringProcurementSettings", "CateringQuote", "CateringReconciliation", "CateringReservation", "CateringReturnedItem", "CateringSettings", "CateringStaffFeedback", "CateringStaffingRole", "CateringTransferProof", "CateringTrip", "CateringVehicle", "Client", "ClientInteraction", "ClientSegment", "ContactRateLimit", "DailyFinancialSummary", "DeliveryBonusRecord", "DeliveryBonusTier", "DeliveryCompany", "DeliveryMessage", "DeliveryPerson", "DeliveryReceiptCompliance", "DeliveryZone", "Department", "Deposit", "DisciplinaryAction", "EmailNotificationSettings", "Employee", "EmployeeBorrowing", "EmployeePrivate", "ExEmployee", "Expense", "ExpiryReport", "FinanceAccount", "FinanceAuditEvent", "FinanceBudget", "FinanceCompany", "FinanceHealthAnalysis", "FinanceHealthFinding", "FinanceHealthReview", "FinanceJournal", "FinanceLedgerLine", "FinanceManualStatus", "FinancePostingIssue", "FinanceProposal", "FinanceTaxAssessment", "FinanceTaxConfig", "FinanceTaxDocument", "FinanceTaxRule", "FinanceVarianceAlertConfig", "FoodCostCalculation", "GLAccount", "InventoryCategory", "InventoryItem", "JobRunLog", "JournalEntry", "KitchenItemAssignment", "KitchenManual", "KitchenPurchaseRequest", "KitchenReleaseSlip", "Lead", "LeadSourceMapping", "LevelUpgradeRequest", "LoyaltyTier", "MarketingCampaign", "MenuCategory", "MenuItem", "MenuItemOption", "MenuOption", "MenuProfitabilityAnalysis", "MenuSection", "MilestoneAchievement", "Notification", "OperationalMeeting", "Order", "OrderChangeLog", "PageView", "Payout", "PayrollDisbursement", "PayrollSettings", "Payslip", "PerformanceAppraisal", "PermissionSyncLog", "PreparationArea", "PrimalCut", "Printer", "ProcessingBatch", "ProductionOrder", "Purchase", "PurchaseInvoice", "PurchaseOrder", "PurchaseSubmission", "Recipe", "RecommendationEvent", "Redemption", "ReferralBonus", "ReferralMilestone", "RegistrationLevel", "RegistrationRequest", "ReportRecipientSettings", "Requisition", "RequisitionLine", "RequisitionRevision", "RestaurantInfo", "RestaurantLocation", "Return", "Review", "Reward", "RewardCategory", "ReworkEvent", "Role", "SMSNotificationPreferences", "SalaryPenalty", "SalaryRecord", "SalaryRevision", "ScheduleSettings", "SharedReportLink", "Shift", "SlaughterEvent", "SocialMediaConnection", "StorageLocation", "Supplier", "SupplierReview", "SystemSettings", "Table", "TableFeedback", "TalabatReceipt", "UiTranslation", "UserNotificationPreferences", "UserPermissions", "VendorSupportInfo", "VeraKit360ManualSection", "VisaCredit", "VoiceOrder", "WasteByProduct", "WasteDeclaration"];

const MAX_ROUNDS = 40; // bounded delete passes per table per request

async function countAll(svc) {
  const rows = [];
  for (let i = 0; i < TABLES.length; i += 6) {
    const batch = TABLES.slice(i, i + 6);
    const settled = await Promise.allSettled(batch.map((t) => svc.entities[t].count()));
    settled.forEach((s, j) => rows.push({
      table: batch[j],
      count: s.status === 'fulfilled' ? Number(s.value) || 0 : null,
      error: s.status === 'rejected' ? String(s.reason?.message || s.reason) : undefined,
    }));
  }
  return rows;
}

async function clearTable(svc, table) {
  const entity = svc.entities[table];
  const before = Number(await entity.count()) || 0;
  let remaining = before;
  let rounds = 0;
  while (remaining > 0 && rounds < MAX_ROUNDS) {
    await entity.deleteMany({});
    rounds++;
    const next = Number(await entity.count()) || 0;
    if (next >= remaining) { remaining = next; break; } // no progress — stop
    remaining = next;
  }
  return { table, before, deleted: before - remaining, remaining, success: remaining === 0 };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;

    if (body.action === 'counts') {
      return Response.json({ tables: await countAll(svc) });
    }

    if (body.action === 'clear') {
      const table = body.table;
      if (!TABLES.includes(table)) return Response.json({ error: 'Unknown table' }, { status: 400 });
      const result = await clearTable(svc, table).catch((e) => ({
        table, before: null, deleted: 0, remaining: null, success: false, error: String(e?.message || e),
      }));
      audit(base44, user, 'delete', table,
        `Go Live Cleanup cleared ${result.deleted} record(s) from ${table}${result.success ? '' : ' (incomplete)'}`);
      return Response.json(result);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}