import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Download, Upload, Database, CheckCircle2, AlertTriangle,
  Loader2, Settings, UtensilsCrossed, Package, ShoppingCart,
  Receipt, Users, Truck, PoundSterling, Megaphone, BarChart3, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { resyncAfterBulk } from "@/lib/permissionResync";
import { logSuccess } from "@/components/utils/auditLogHelper";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ENTITY_GROUPS = [
  {
    category: "Settings & Configuration",
    icon: Settings,
    entities: ["Branch", "RestaurantInfo", "RestaurantLocation", "Printer", "SystemSettings", "AttendancePolicy", "EmailNotificationSettings", "SMSNotificationPreferences", "UserPermissions"],
  },
  {
    category: "Menu",
    icon: UtensilsCrossed,
    entities: ["MenuItem", "MenuCategory", "MenuSection", "MenuItemOption", "MenuOption"],
  },
  {
    category: "Inventory",
    icon: Package,
    entities: ["InventoryCategory", "InventoryItem", "WasteDeclaration", "FoodCostCalculation", "MenuProfitabilityAnalysis"],
  },
  {
    category: "Purchasing",
    icon: ShoppingCart,
    entities: ["Supplier", "SupplierReview", "PurchaseOrder", "PurchaseInvoice", "PurchaseSubmission", "Purchase", "CashierPurchase", "Return", "Deposit"],
  },
  {
    category: "Orders & Tables",
    icon: Receipt,
    entities: ["Order", "Table", "TalabatReceipt"],
  },
  {
    category: "Clients & Loyalty",
    icon: Users,
    entities: ["Client", "Address", "CashbackTransaction", "CashbackRule", "CashbackRuleHistory", "CashbackTier", "CashbackDistributionPending", "LoyaltyTier", "RegistrationLevel", "RegistrationRequest", "LevelUpgradeRequest", "Redemption", "Reward", "RewardCategory", "MilestoneAchievement", "ReferralMilestone", "ReferralBonus", "Payout", "BalanceRecharge", "VisaCredit"],
  },
  {
    category: "Delivery",
    icon: Truck,
    entities: ["DeliveryCompany", "DeliveryPerson", "DeliveryZone", "DeliveryBonusRecord", "DeliveryBonusTier", "DeliveryMessage"],
  },
  {
    category: "HR & Payroll",
    icon: Users,
    entities: ["Employee", "Attendance", "SalaryRecord", "SalaryPenalty", "EmployeeBorrowing", "Shift"],
  },
  {
    category: "Cashier & Financial",
    icon: PoundSterling,
    entities: ["CashierSession", "Expense", "GLAccount", "JournalEntry", "DailyFinancialSummary"],
  },
  {
    category: "Marketing & Notifications",
    icon: Megaphone,
    entities: ["MarketingCampaign", "CampaignRecipient", "Lead", "Notification", "Review", "RecommendationEvent", "UserNotificationPreferences"],
  },
  {
    category: "Analytics & Logs",
    icon: BarChart3,
    entities: ["PageView", "AuditLog", "OrderChangeLog"],
  },
  {
    category: "Other",
    icon: Layers,
    entities: ["VeraKit360ManualSection"],
  },
];

const ALL_ENTITIES = ENTITY_GROUPS.flatMap((g) => g.entities);
const BUILTIN_FIELDS = ["id", "created_date", "updated_date", "created_by_id"];
const BATCH_SIZE = 400;
const FETCH_BATCH = 1000;

async function fetchAllRecords(entityName) {
  const all = [];
  let cursor = null;
  let guard = 0;
  while (guard < 500) {
    const query = cursor ? { created_date: { $lt: cursor } } : {};
    const batch = await base44.entities[entityName].filter(query, "-created_date", FETCH_BATCH);
    if (!batch || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < FETCH_BATCH) break;
    cursor = batch[batch.length - 1]?.created_date;
    if (!cursor) break;
    guard++;
  }
  return all;
}

export default function DataCloneManager() {
  const [selectedEntities, setSelectedEntities] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // "export" | "import"
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [results, setResults] = useState(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const toggleEntity = (name) => {
    setSelectedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleGroup = (entities) => {
    setSelectedEntities((prev) => {
      const next = new Set(prev);
      const allSelected = entities.every((e) => next.has(e));
      if (allSelected) entities.forEach((e) => next.delete(e));
      else entities.forEach((e) => next.add(e));
      return next;
    });
  };

  const selectAll = () => setSelectedEntities(new Set(ALL_ENTITIES));
  const deselectAll = () => setSelectedEntities(new Set());

  const handleExport = async () => {
    if (selectedEntities.size === 0) {
      toast.error("Select at least one module to export");
      return;
    }
    setBusy(true);
    setMode("export");
    setProgress(0);
    setResults(null);

    const brand = (await base44.entities.RestaurantInfo.list())[0]?.brand_name?.trim() || "";
    const exportData = { exported_at: new Date().toISOString(), app: brand, entities: {} };
    const entities = Array.from(selectedEntities);
    const errors = [];
    let completed = 0;

    for (const entityName of entities) {
      try {
        if (!base44.entities[entityName]) {
          errors.push(`${entityName}: entity not found in SDK`);
          exportData.entities[entityName] = [];
          continue;
        }
        setProgressLabel(`Exporting ${entityName}...`);
        const records = await fetchAllRecords(entityName);
        exportData.entities[entityName] = records;
      } catch (e) {
        errors.push(`${entityName}: ${e.message}`);
        exportData.entities[entityName] = [];
      }
      completed++;
      setProgress(Math.round((completed / entities.length) * 100));
    }

    const totalRecords = Object.values(exportData.entities).reduce((s, a) => s + a.length, 0);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = brand.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    a.download = `${slug ? slug + "-" : ""}clone-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setResults({ mode: "export", entityCount: entities.length, totalRecords, errors });
    logSuccess("export", "DataClone", `Exported ${totalRecords} records from ${entities.length} modules`);
    toast.success(`Exported ${totalRecords} records from ${entities.length} modules`);
    setBusy(false);
    setMode(null);
    setProgressLabel("");
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.entities || typeof data.entities !== "object") {
        toast.error("Invalid file: missing 'entities' object");
        return;
      }
      if (clearBeforeImport) {
        setPendingFile(data);
        setShowImportConfirm(true);
      } else {
        await processImport(data);
      }
    } catch (e) {
      toast.error(`Failed to read file: ${e.message}`);
    }
  };

  const processImport = async (data) => {
    setBusy(true);
    setMode("import");
    setProgress(0);
    setResults(null);

    const entityNames = Object.keys(data.entities);
    const summary = [];
    const errors = [];
    let completed = 0;

    // Permission records hold roles: only central admins may import them.
    const me = await base44.auth.me();
    const isCentralAdmin = me?.role === "admin" || me?.perm_is_central_admin === true;

    for (const entityName of entityNames) {
      if (entityName === "UserPermissions" && !isCentralAdmin) {
        errors.push("UserPermissions: skipped — only central admins can import permission records");
        summary.push({ entity: entityName, count: 0, skipped: true });
        completed++;
        setProgress(Math.round((completed / entityNames.length) * 100));
        continue;
      }
      if (!base44.entities[entityName]) {
        errors.push(`${entityName}: entity does not exist in this app — skipped`);
        summary.push({ entity: entityName, count: 0, skipped: true });
        completed++;
        setProgress(Math.round((completed / entityNames.length) * 100));
        continue;
      }

      try {
        setProgressLabel(`Importing ${entityName}...`);

        // Journal entries are append-only: never cleared, only added to.
        if (clearBeforeImport && entityName === "JournalEntry") {
          errors.push("JournalEntry: existing entries kept (journal is append-only); imported entries were added alongside them");
        } else if (clearBeforeImport) {
          try {
            await base44.entities[entityName].deleteMany({});
          } catch (e) {
            errors.push(`${entityName}: could not clear existing data — ${e.message}`);
          }
        }

        const records = (data.entities[entityName] || []).map((r) => {
          const cleaned = { ...r };
          BUILTIN_FIELDS.forEach((f) => delete cleaned[f]);
          return cleaned;
        });

        let created = 0;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          const batch = records.slice(i, i + BATCH_SIZE);
          try {
            await base44.entities[entityName].bulkCreate(batch);
            created += batch.length;
          } catch (e) {
            errors.push(`${entityName} (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${e.message}`);
          }
        }
        summary.push({ entity: entityName, count: created });
      } catch (e) {
        errors.push(`${entityName}: ${e.message}`);
        summary.push({ entity: entityName, count: 0 });
      }
      completed++;
      setProgress(Math.round((completed / entityNames.length) * 100));
    }

    try {
      setProgressLabel("Re-syncing account permissions...");
      const sync = await resyncAfterBulk(entityNames);
      if (sync?.failed?.length) errors.push(`Permission sync failed for ${sync.failed.length} account(s) — see Permission Sync Log`);
    } catch (e) {
      errors.push(`Permission sync could not run: ${e.message}`);
    }

    const totalImported = summary.reduce((s, x) => s + x.count, 0);
    setResults({ mode: "import", entityCount: entityNames.length, totalRecords: totalImported, summary, errors });
    logSuccess("import", "DataClone", `Imported ${totalImported} records across ${entityNames.length} modules`);
    toast.success(`Imported ${totalImported} records successfully`);
    setBusy(false);
    setMode(null);
    setProgressLabel("");
  };

  return (
    <div className="space-y-6">
      {/* Info / Warning */}
      <Card className="p-4 border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 space-y-1">
            <p className="font-medium">Data Clone — Export & Import</p>
            <p>Export selected modules to a JSON file for backup or cloning into another app. Import from a previously exported file to replicate data here.</p>
            <ul className="list-disc list-inside text-xs space-y-0.5 mt-2 text-amber-800">
              <li>User accounts are not included — they are managed by the platform auth system.</li>
              <li>On import, new record IDs are generated. Cross-entity references (e.g. <code>customer_id</code>, <code>branch_id</code>) will not automatically remap.</li>
              <li>Entities with unique fields (e.g. <code>referral_code</code>, <code>invoice_number</code>) may conflict with existing data — use the "Clear existing data" option.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Entity Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Select Modules
            <Badge count={selectedEntities.size} />
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAll} disabled={busy}>Select All</Button>
            <Button size="sm" variant="outline" onClick={deselectAll} disabled={busy}>Deselect All</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENTITY_GROUPS.map((group) => {
            const Icon = group.icon;
            const allSelected = group.entities.every((e) => selectedEntities.has(e));
            const someSelected = group.entities.some((e) => selectedEntities.has(e));
            return (
              <div key={group.category} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={() => toggleGroup(group.entities)}
                      disabled={busy}
                    />
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{group.category}</span>
                  </label>
                  <span className="text-xs text-slate-400">{group.entities.length}</span>
                </div>
                <div className="pl-6 space-y-1 max-h-48 overflow-y-auto">
                  {group.entities.map((name) => (
                    <label key={name} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                      <Checkbox
                        checked={selectedEntities.has(name)}
                        onCheckedChange={() => toggleEntity(name)}
                        disabled={busy}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Export & Import */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Export */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Export Data</h3>
          </div>
          <p className="text-sm text-slate-500">
            Download all records from the {selectedEntities.size} selected module{selectedEntities.size !== 1 ? "s" : ""} as a single JSON file.
          </p>
          <Button
            onClick={handleExport}
            disabled={busy || selectedEntities.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {mode === "export" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {mode === "export" ? "Exporting..." : `Export ${selectedEntities.size} Module${selectedEntities.size !== 1 ? "s" : ""}`}
          </Button>
        </Card>

        {/* Import */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">Import Data</h3>
          </div>
          <p className="text-sm text-slate-500">
            Upload a previously exported JSON file to clone data into this app.
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <Checkbox
              checked={clearBeforeImport}
              onCheckedChange={(v) => setClearBeforeImport(v === true)}
              disabled={busy}
            />
            <span>Clear existing data before import <span className="text-red-500 font-medium">(destructive)</span></span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            variant="outline"
            className="w-full border-green-600 text-green-700 hover:bg-green-50"
          >
            {mode === "import" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {mode === "import" ? "Importing..." : "Choose JSON File"}
          </Button>
        </Card>
      </div>

      {/* Progress */}
      {busy && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{progressLabel}</span>
            <span className="font-medium text-slate-900">{progress}%</span>
          </div>
          <Progress value={progress} />
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">
              {results.mode === "export" ? "Export Complete" : "Import Complete"}
            </h3>
          </div>
          <div className="text-sm text-slate-600">
            {results.mode === "export"
              ? `Exported ${results.totalRecords} record${results.totalRecords !== 1 ? "s" : ""} from ${results.entityCount} module${results.entityCount !== 1 ? "s" : ""}.`
              : `Imported ${results.totalRecords} record${results.totalRecords !== 1 ? "s" : ""} across ${results.entityCount} module${results.entityCount !== 1 ? "s" : ""}.`}
          </div>

          {results.summary && results.summary.length > 0 && (
            <div className="max-h-60 overflow-y-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-600">Entity</th>
                    <th className="text-right p-2 font-medium text-slate-600">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {results.summary.map((s) => (
                    <tr key={s.entity} className="border-t">
                      <td className="p-2 text-slate-700">{s.entity}{s.skipped ? " ⚠️" : ""}</td>
                      <td className="p-2 text-right text-slate-700">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results.errors && results.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {results.errors.length} error{results.errors.length !== 1 ? "s" : ""}
              </p>
              <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded-md p-2 space-y-1">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Import Confirmation */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Destructive Import</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFile ? (
                <>
                  This will permanently delete <strong>ALL existing records</strong> in the following{" "}
                  {Object.keys(pendingFile.entities).length} entities before importing:
                  <div className="mt-2 text-xs font-mono bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto">
                    {Object.keys(pendingFile.entities).join(", ")}
                  </div>
                  <div className="mt-2">This action cannot be undone.</div>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowImportConfirm(false);
                if (pendingFile) processImport(pendingFile);
                setPendingFile(null);
              }}
            >
              Delete & Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Badge({ count }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-slate-200 text-slate-700">
      {count}
    </span>
  );
}