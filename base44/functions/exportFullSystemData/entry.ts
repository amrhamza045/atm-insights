import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { audit } from '../../shared/auditLog.js';
import JSZip from 'npm:jszip@3.10.1';

// Every entity in the system, grouped by module / functional area
const MODULE_CATALOG = [
  {
    folder: "01 - Company, Branches & Settings",
    entities: [
      "RestaurantInfo", "Branch", "RestaurantLocation", "SystemSettings",
      "ScheduleSettings", "ReportRecipientSettings", "EmailNotificationSettings",
      "SMSNotificationPreferences", "Printer", "UiTranslation", "VendorSupportInfo"
    ],
  },
  {
    folder: "02 - Users, Roles & Security",
    entities: [
      "User", "Role", "UserPermissions", "PermissionSyncLog",
      "AuditLog", "UserNotificationPreferences", "ContactRateLimit", "SharedReportLink"
    ],
  },
  {
    folder: "03 - Catering Events, Quotes & Packages",
    entities: [
      "CateringEvent", "CateringQuote", "CateringReservation", "CateringPackage",
      "CateringOption", "CateringEventTypeDiscount", "CateringCancellationPolicy",
      "CateringSettings", "CateringProcurementSettings", "CateringInvitation", "CateringPassBranding"
    ],
  },
  {
    folder: "04 - Catering Payments, Portal & Costing",
    entities: [
      "CateringPayment", "CateringPaymentPolicy", "CateringPaymentReviewLock",
      "CateringReceiptSettings", "CateringPortalAccess", "CateringPortalQuoteOverride",
      "CateringReconciliation", "CateringActualCostRun", "CateringCostBudget", "CateringCostException"
    ],
  },
  {
    folder: "05 - Catering Operations, Assets & Logistics",
    entities: [
      "CateringAssignment", "CateringStaffingRole", "CateringStaffFeedback",
      "CateringEquipmentCategory", "CateringEquipment", "CateringEquipmentUnit",
      "CateringEquipmentReservation", "CateringEquipmentMaintenance",
      "CateringVehicle", "CateringTrip", "CateringMediaVendor",
      "CateringCustodyCheckpoint", "CateringTransferProof", "CateringReturnedItem"
    ],
  },
  {
    folder: "06 - Requisitions & Kitchen Releases",
    entities: [
      "Requisition", "RequisitionRevision", "RequisitionLine",
      "KitchenReleaseSlip", "KitchenPurchaseRequest"
    ],
  },
  {
    folder: "07 - Menu, Recipes & Food Cost",
    entities: [
      "MenuSection", "MenuCategory", "MenuItem", "MenuOption", "MenuItemOption",
      "Recipe", "FoodCostCalculation", "MenuProfitabilityAnalysis"
    ],
  },
  {
    folder: "08 - Manufacturing & Kitchen Display",
    entities: [
      "ProductionOrder", "PreparationArea", "KitchenItemAssignment",
      "KitchenManual", "VeraKit360ManualSection"
    ],
  },
  {
    folder: "09 - Butchery",
    entities: [
      "ButcherySupplier", "Animal", "SlaughterEvent", "ProcessingBatch",
      "PrimalCut", "ButcheryRawMaterial", "ReworkEvent", "WasteByProduct", "ButcheryExpense"
    ],
  },
  {
    folder: "10 - Inventory, Stock, Units & Waste",
    entities: [
      "InventoryCategory", "StorageLocation", "InventoryItem", "InventoryMovement",
      "InventoryAccountingMovement", "UnitDefinition", "UnitConversionRule",
      "WasteDeclaration", "ExpiryReport"
    ],
  },
  {
    folder: "11 - Purchasing & Suppliers",
    entities: [
      "Supplier", "SupplierReview", "PurchaseOrder", "PurchaseInvoice",
      "PurchaseSubmission", "Purchase", "CashierPurchase", "SupplierPayment",
      "SupplierLedgerEntry", "Return", "Deposit"
    ],
  },
  {
    folder: "12 - POS, Cashier & Counter Orders",
    entities: [
      "Order", "OrderChangeLog", "VoiceOrder", "Table", "TableFeedback",
      "TalabatReceipt", "CashierSession", "VisaCredit"
    ],
  },
  {
    folder: "13 - Delivery",
    entities: [
      "DeliveryCompany", "DeliveryZone", "DeliveryPerson", "DeliveryBonusTier",
      "DeliveryBonusRecord", "DeliveryMessage", "DeliveryReceiptCompliance"
    ],
  },
  {
    folder: "14 - CRM, Clients & Marketing",
    entities: [
      "Client", "Address", "ClientSegment", "ClientInteraction",
      "Lead", "LeadSourceMapping", "MarketingCampaign", "CampaignRecipient",
      "SocialMediaConnection", "Review", "RecommendationEvent"
    ],
  },
  {
    folder: "15 - Loyalty, Referrals & Rewards",
    entities: [
      "RegistrationLevel", "RegistrationRequest", "LevelUpgradeRequest",
      "LoyaltyTier", "CashbackTier", "CashbackRule", "CashbackRuleHistory",
      "CashbackTransaction", "CashbackDistributionPending",
      "ReferralMilestone", "MilestoneAchievement", "ReferralBonus", "ReferralCommission",
      "RewardCategory", "Reward", "Redemption", "Payout", "BalanceRecharge"
    ],
  },
  {
    folder: "16 - HR, Attendance & Payroll",
    entities: [
      "Department", "Employee", "EmployeePrivate", "ExEmployee",
      "Shift", "AttendancePolicy", "Attendance",
      "PayrollSettings", "SalaryRecord", "SalaryRevision", "SalaryPenalty",
      "Payslip", "PayrollDisbursement", "BorrowingPolicy", "EmployeeBorrowing",
      "DisciplinaryAction", "PerformanceAppraisal", "OperationalMeeting"
    ],
  },
  {
    folder: "17 - Finance, General Ledger & Tax",
    entities: [
      "FinanceCompany", "FinanceAccount", "FinanceAccountBinding", "FinanceMappingVersion",
      "FinancePaymentMethod", "FinanceWasteReason", "FinanceOpeningBalance",
      "FinanceJournal", "FinanceLedgerLine", "FinanceProposal", "FinancePostingIssue",
      "FinanceEventRecovery", "CustomerAccount", "CustomerAccountSync",
      "FinanceBudget", "FinanceVarianceAlertConfig", "FinanceManualStatus",
      "FinanceAuditEvent", "FinanceHealthAnalysis", "FinanceHealthReview", "FinanceHealthFinding",
      "FinanceTaxConfig", "FinanceTaxRule", "FinanceTaxAssessment", "FinanceTaxDocument",
      "GLAccount", "JournalEntry", "DailyFinancialSummary", "Expense"
    ],
  },
  {
    folder: "18 - Petty Cash, Custody & Expenses",
    entities: [
      "FinanceCustody", "FinanceCustodyEntry", "FinanceCustodyRequest",
      "FinanceExpenseType", "FinanceExpenseDisbursement"
    ],
  },
  {
    folder: "19 - Notifications, Analytics & System Logs",
    entities: [
      "Notification", "EmailSendLog", "PageView", "JobRunLog"
    ],
  },
];

const ENTITY_TO_FOLDER = new Map();
for (const group of MODULE_CATALOG) {
  for (const entity of group.entities) {
    ENTITY_TO_FOLDER.set(entity, group.folder);
  }
}
const ALL_ENTITIES = Array.from(ENTITY_TO_FOLDER.keys());

function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  let str;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function convertToCSV(records) {
  const priorityCols = ['id', 'created_date', 'updated_date', 'created_by_id'];
  if (!records || records.length === 0) {
    return '\uFEFF' + priorityCols.join(',');
  }
  const keySet = new Set(priorityCols);
  for (const r of records) {
    if (r && typeof r === 'object') {
      for (const k of Object.keys(r)) keySet.add(k);
    }
  }
  const headers = Array.from(keySet);
  const lines = [headers.map(escapeCSVValue).join(',')];
  for (const r of records) {
    const row = headers.map((h) => escapeCSVValue(r ? r[h] : ''));
    lines.push(row.join(','));
  }
  // UTF-8 BOM so Excel opens Arabic and accented text cleanly
  return '\uFEFF' + lines.join('\n');
}

async function fetchEntityRecords(svc, entityName) {
  if (entityName === 'User') {
    const users = await svc.entities.User.list('-created_date', 5000);
    return Array.isArray(users) ? users : [];
  }
  const records = [];
  let cursor = null;
  let guard = 0;
  while (guard < 200) {
    const page = await svc.entities[entityName].filter(
      {},
      { sort: '-created_date', limit: 500, ...(cursor ? { cursor } : {}) }
    );
    if (page?.items?.length) {
      records.push(...page.items);
    }
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
    guard++;
  }
  return records;
}

function safeFileSegment(text) {
  return String(text || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Only administrators can export full system data' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;

    if (body.action === 'catalog') {
      const info = await svc.entities.RestaurantInfo.list().catch(() => []);
      const appName = safeFileSegment(info?.[0]?.brand_name) || 'Application';
      return Response.json({
        appName,
        totalEntities: ALL_ENTITIES.length,
        modules: MODULE_CATALOG,
      });
    }

    const includeEmpty = body.includeEmpty !== false;
    const requested = Array.isArray(body.targetEntities) && body.targetEntities.length > 0
      ? body.targetEntities
      : ALL_ENTITIES;
    const entitiesToExport = requested.filter((e) => ENTITY_TO_FOLDER.has(e));
    if (entitiesToExport.length === 0) {
      return Response.json({ error: 'No valid modules requested for export' }, { status: 400 });
    }

    const zip = new JSZip();
    const summaryRows = [];
    const result = { exported: 0, empty: 0, totalRecords: 0, failed: [] };

    // Process in parallel batches of 6 (respecting Worker connection pool limit)
    for (let i = 0; i < entitiesToExport.length; i += 6) {
      const batch = entitiesToExport.slice(i, i + 6);
      const settled = await Promise.allSettled(
        batch.map(async (entityName) => {
          const records = await fetchEntityRecords(svc, entityName);
          return { entityName, records };
        })
      );

      for (let j = 0; j < settled.length; j++) {
        const entityName = batch[j];
        const folder = ENTITY_TO_FOLDER.get(entityName) || 'Other';
        const outcome = settled[j];

        if (outcome.status === 'rejected') {
          const errMsg = String(outcome.reason?.message || outcome.reason || 'Export error');
          result.failed.push({ entity: entityName, module: folder, error: errMsg });
          summaryRows.push({
            module: folder,
            functionality_csv: `${folder}/${entityName}.csv`,
            entity: entityName,
            record_count: 0,
            status: `failed: ${errMsg}`,
          });
          continue;
        }

        const { records } = outcome.value;
        result.totalRecords += records.length;

        if (records.length > 0 || includeEmpty) {
          const csv = convertToCSV(records);
          zip.file(`${folder}/${entityName}.csv`, csv);
          if (records.length > 0) result.exported++;
          else result.empty++;
          summaryRows.push({
            module: folder,
            functionality_csv: `${folder}/${entityName}.csv`,
            entity: entityName,
            record_count: records.length,
            status: records.length > 0 ? 'exported' : 'exported (empty header)',
          });
        } else {
          result.empty++;
          summaryRows.push({
            module: folder,
            functionality_csv: '',
            entity: entityName,
            record_count: 0,
            status: 'skipped (empty)',
          });
        }
      }
    }

    // Add root manifest CSV summarizing every module & functionality exported
    const manifestHeaders = ['module', 'functionality_csv', 'entity', 'record_count', 'status'];
    const manifestLines = [
      manifestHeaders.join(','),
      ...summaryRows.map((r) => manifestHeaders.map((h) => escapeCSVValue(r[h])).join(',')),
    ];
    zip.file('00 - Export Summary.csv', '\uFEFF' + manifestLines.join('\n'));

    const zipBase64 = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const info = await svc.entities.RestaurantInfo.list().catch(() => []);
    const appName = safeFileSegment(info?.[0]?.brand_name) || 'Application';
    const exportDate = safeFileSegment(body.exportDate) || new Date().toISOString().slice(0, 10);
    const fileName = `${appName} - ${exportDate}.zip`;

    await audit(
      base44,
      user,
      'export',
      'SystemDataExport',
      `Exported ${result.totalRecords} records across ${entitiesToExport.length} tables into "${fileName}"`
    );

    return Response.json({
      success: true,
      appName,
      exportDate,
      fileName,
      zipData: zipBase64,
      summary: result,
      modulesExported: new Set(entitiesToExport.map((e) => ENTITY_TO_FOLDER.get(e))).size,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}