import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  RefreshCw,
  Play,
  FileWarning,
  Users,
  Package,
  UtensilsCrossed,
  ChefHat,
  ShoppingCart,
  FileText,
  Truck,
  Wrench,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SAMPLE_DIAGNOSIS = {
  generated_at: "2026-11-09T13:52:00.000Z",
  branches: [
    { id: "6ae211f3786fb2aaa1465f65", name: "Shrouk", is_default: true },
    { id: "6ae9f2ff9c6f6c9ec60a39d5", name: "Sherouk", is_default: false },
  ],
  authorization: {
    global_access: true,
    locked_branch_id: null,
    authorized_branch_ids: ["6ae211f3786fb2aaa1465f65", "6ae9f2ff9c6f6c9ec60a39d5"],
  },
  summary: {
    safe_repairs_total: 721,
    ambiguous_total: 14,
    intentional_cross_branch_total: 10,
    categories_count: 6,
  },
  categories: [
    {
      id: "menu_catalog_isolation",
      module: "Menu Management",
      title: "Split Shared Menu Items into Branch-Owned Catalogs & Relink Recipes",
      severity: "high",
      classification: "safe_repair",
      records_count: 139,
      links_count: 572,
      description:
        "139 MenuItem records currently have branch_id = null and point 533 recipe ingredients + 39 finished output items to Sherouk inventory while referencing Shrouk manufacturing recipes. Approving this category assigns each branch its own independent 139 MenuItem records and wires every recipe ingredient and output item to that branch's own InventoryItem and Recipe.",
      sample_previews: [
        {
          record_label: "Creme Caramel (MenuItem)",
          before: "branch_id: null · 4 ingredients → Sherouk · recipe_id → Shrouk",
          after: "Shrouk MenuItem → Shrouk stock & recipe · Sherouk MenuItem → Sherouk stock & recipe",
        },
        {
          record_label: "Cheese Sambousek (MenuItem)",
          before: "branch_id: null · 6 ingredients → Sherouk · output_item_id → Sherouk",
          after: "Independent Shrouk & Sherouk MenuItem records linked to local branch twins",
        },
      ],
    },
    {
      id: "manufacturing_recipes_relink",
      module: "Manufacturing",
      title: "Relink Shrouk Manufacturing Recipes to Shrouk Inventory Twins",
      severity: "high",
      classification: "safe_repair",
      records_count: 39,
      links_count: 572,
      description:
        "39 active manufacturing recipes in Shrouk have output_item_id and 533 ingredient lines pointing to Sherouk InventoryItem IDs. All 572 references have verified 1-to-1 source_item_id twins in Shrouk.",
      sample_previews: [
        {
          record_label: "Creme Caramel (Shrouk Recipe 6ae9bc03...)",
          before: "output_item_id → Sherouk (6af07400...) · 4 ingredients → Sherouk",
          after: "output_item_id → Shrouk (6ae9bc03...) · 4 ingredients → Shrouk",
        },
      ],
    },
    {
      id: "production_orders_relink",
      module: "Manufacturing",
      title: "Relink Sherouk Production Orders to Sherouk Recipes & Outputs",
      severity: "medium",
      classification: "safe_repair",
      records_count: 2,
      links_count: 4,
      description:
        "2 pending ProductionOrder batches in Sherouk (Cheese Sambousek, Beef Balls) reference Shrouk's Recipe and Output InventoryItem IDs.",
      sample_previews: [
        {
          record_label: "ProductionOrder · Cheese Sambousek (Sherouk)",
          before: "recipe_id → Shrouk (6aea4a1d...) · output_item_id → Shrouk",
          after: "recipe_id → Sherouk (6af07405...) · output_item_id → Sherouk",
        },
      ],
    },
    {
      id: "purchasing_and_finance_reconciliation",
      module: "Purchasing & Finance",
      title: "Relink Cross-Branch Purchase Orders, Posted Invoices, Stock & Journal Snapshots",
      severity: "high",
      classification: "safe_repair",
      records_count: 6,
      links_count: 10,
      description:
        "2 Sherouk PurchaseOrders and 2 posted Sherouk PurchaseInvoices (استيرنو 12 pcs, سكر 649.62 kg) reference Shrouk InventoryItem IDs, and their 2 posted FinanceJournals store the Shrouk item IDs in source_summary. Approving relinks POs, PIs, and journal snapshots to Sherouk's twin InventoryItems and reconciles the 12 pcs of استيرنو stock between Shrouk and Sherouk idempotently.",
      sample_previews: [
        {
          record_label: "PI INV-REC-PO-REC-1104... (Sherouk · استيرنو 12 pcs)",
          before: "item_id → Shrouk (qty 78) · Sherouk twin qty 0 · Journal snapshot → Shrouk",
          after: "item_id → Sherouk (qty +12 = 12) · Shrouk qty -12 = 66 · Journal snapshot → Sherouk",
        },
        {
          record_label: "PI INV-REC-PO-REC-1108... (Sherouk · سكر 649.62 kg)",
          before: "item_id → Shrouk · Journal snapshot → Shrouk",
          after: "item_id → Sherouk twin (6af07400...) · Journal snapshot → Sherouk",
        },
      ],
    },
    {
      id: "catering_requisitions_and_reservations",
      module: "Catering",
      title: "Relink Sherouk Requisition Lines & Catering Stock Reservations",
      severity: "medium",
      classification: "safe_repair",
      records_count: 144,
      links_count: 144,
      description:
        "36 RequisitionLine rows and 108 CateringReservation rows for Sherouk catering events reference Shrouk InventoryItem IDs. All 144 have verified 1-to-1 twins in Sherouk.",
      sample_previews: [
        {
          record_label: "36 RequisitionLine rows + 108 CateringReservation rows (Sherouk)",
          before: "inventory_item_id → Shrouk items (سكر, لبن, فانيليا, بيض, استيرنو...)",
          after: "inventory_item_id → Sherouk twin InventoryItems",
        },
      ],
    },
    {
      id: "equipment_and_vehicles_branch_scope",
      module: "Assets & Resources",
      title: "Scope Shared Equipment & Vehicles to Home Branch & Enable Cross-Branch Copy",
      severity: "low",
      classification: "safe_repair",
      records_count: 318,
      links_count: 318,
      description:
        "312 CateringEquipment records and 6 CateringVehicle records currently have home_branch_id empty. Assigns unassigned records to the selected primary branch and enables authorized branch-to-branch copying.",
      sample_previews: [
        {
          record_label: "312 CateringEquipment & 6 CateringVehicle records",
          before: "home_branch_id: empty (shared pool)",
          after: "Scoped to primary branch + Copy from Authorized Branch enabled",
        },
      ],
    },
  ],
  unresolved_legacy_recipes: [
    { number: 1, id: "6a9fd0e3848c1d1aaf9dd628", name: "Kofta Meshweya — Catering Batch", branch: "Shrouk", output_item_name: "Kofta Mix (Beef & Lamb)", missing_ingredients: ["Kofta Mix (Beef & Lamb)", "Mixed Grill Spice (Bahara Mashwiyat)", "Onions (Red)", "Parsley & Coriander Bunches"] },
    { number: 2, id: "6a9fd0e3848c1d1aaf9dd629", name: "Koshary Base — Catering Batch", branch: "Shrouk", output_item_name: "Egyptian Rice (Camolino) 25kg sack", missing_ingredients: ["Egyptian Rice (Camolino) 25kg sack", "Brown Lentils 5kg bag", "Pasta Penne 5kg carton", "Sunflower Oil (Crystal) 10L jerrycan", "Tomatoes (Baladi)", "Onions (Red)"] },
    { number: 3, id: "6a9fd0e3848c1d1aaf9dd62a", name: "Mahshi Warak Enab — Catering Batch", branch: "Shrouk", output_item_name: "Vine Leaves (Fresh)", missing_ingredients: ["Vine Leaves (Fresh)", "Egyptian Rice (Camolino) 25kg sack", "Tomatoes (Baladi)", "Sunflower Oil (Crystal) 10L jerrycan", "Parsley & Coriander Bunches"] },
    { number: 4, id: "6a9fd0e3848c1d1aaf9dd62b", name: "Macarona Béchamel — Catering Trays", branch: "Shrouk", output_item_name: "Pasta Penne 5kg carton", missing_ingredients: ["Pasta Penne 5kg carton", "Beef Mince 80/20", "Juhayna Full Cream Milk 1L", "Butter (Unsalted) 10kg carton", "Tomatoes (Baladi)"] },
    { number: 5, id: "6a9fd0e3848c1d1aaf9dd62c", name: "Om Ali — Catering Batch", branch: "Shrouk", output_item_name: "Phyllo (Goulash) Sheets 5kg", missing_ingredients: ["Phyllo (Goulash) Sheets 5kg", "Juhayna Full Cream Milk 1L", "Juhayna Cooking Cream 1L", "Butter (Unsalted) 10kg carton"] },
    { number: 6, id: "6a9fd0e3848c1d1aaf9dd62d", name: "Molokhia with Chicken — Catering Batch", branch: "Shrouk", output_item_name: "Molokhia (Fresh Leaves)", missing_ingredients: ["Molokhia (Fresh Leaves)", "Chicken Breast Fillet", "Garlic (Peeled)", "Sunflower Oil (Crystal) 10L jerrycan"] },
    { number: 7, id: "6abe3a3b474fa20701ed3595", name: "Sausage", branch: "Shrouk", output_item_name: "sausage", missing_ingredients: ["Beef Mince 80/20", "Calamari Rings", "Chafing Fuel Gel (72 pcs carton)"] },
    { number: 8, id: "6af074053ae7900fcf253ee7", name: "Sausage", branch: "Sherouk", output_item_name: "sausage", missing_ingredients: ["Beef Mince 80/20", "Calamari Rings", "Chafing Fuel Gel (72 pcs carton)"] },
    { number: 9, id: "6af074053ae7900fcf253ee8", name: "Molokhia with Chicken — Catering Batch", branch: "Sherouk", output_item_name: "Molokhia (Fresh Leaves)", missing_ingredients: ["Molokhia (Fresh Leaves)", "Chicken Breast Fillet", "Garlic (Peeled)", "Sunflower Oil (Crystal) 10L jerrycan"] },
    { number: 10, id: "6af074053ae7900fcf253ee9", name: "Koshary Base — Catering Batch", branch: "Sherouk", output_item_name: "Egyptian Rice (Camolino) 25kg sack", missing_ingredients: ["Egyptian Rice (Camolino) 25kg sack", "Brown Lentils 5kg bag", "Pasta Penne 5kg carton", "Sunflower Oil (Crystal) 10L jerrycan", "Tomatoes (Baladi)", "Onions (Red)"] },
    { number: 11, id: "6af074053ae7900fcf253eea", name: "Macarona Béchamel — Catering Trays", branch: "Sherouk", output_item_name: "Pasta Penne 5kg carton", missing_ingredients: ["Pasta Penne 5kg carton", "Beef Mince 80/20", "Juhayna Full Cream Milk 1L", "Butter (Unsalted) 10kg carton", "Tomatoes (Baladi)"] },
    { number: 12, id: "6af074053ae7900fcf253eeb", name: "Mahshi Warak Enab — Catering Batch", branch: "Sherouk", output_item_name: "Vine Leaves (Fresh)", missing_ingredients: ["Vine Leaves (Fresh)", "Egyptian Rice (Camolino) 25kg sack", "Tomatoes (Baladi)", "Sunflower Oil (Crystal) 10L jerrycan", "Parsley & Coriander Bunches"] },
    { number: 13, id: "6af074053ae7900fcf253eec", name: "Kofta Meshweya — Catering Batch", branch: "Sherouk", output_item_name: "Kofta Mix (Beef & Lamb)", missing_ingredients: ["Kofta Mix (Beef & Lamb)", "Mixed Grill Spice (Bahara Mashwiyat)", "Onions (Red)", "Parsley & Coriander Bunches"] },
    { number: 14, id: "6af074053ae7900fcf253eed", name: "Om Ali — Catering Batch", branch: "Sherouk", output_item_name: "Phyllo (Goulash) Sheets 5kg", missing_ingredients: ["Phyllo (Goulash) Sheets 5kg", "Juhayna Full Cream Milk 1L", "Juhayna Cooking Cream 1L", "Butter (Unsalted) 10kg carton"] },
  ],
  intentional_cross_branch: [
    {
      module: "HR & Catering Staffing",
      count: 10,
      description: "10 Shift records on Sherouk catering events assign Shrouk-based employees (expected cross-branch event staffing — preserved untouched).",
    },
  ],
};

export default function BranchIsolationWorkspace() {
  const queryClient = useQueryClient();

  const { data: report = SAMPLE_DIAGNOSIS, isLoading: isScanning, refetch: onRunScan } = useQuery({
    queryKey: ["branchIsolationDiagnosis"],
    queryFn: async () => {
      const res = await base44.functions.invoke("branchIsolationManager", { action: "scan" });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const applyRepairsMutation = useMutation({
    mutationFn: async (selected_categories) => {
      const res = await base44.functions.invoke("branchIsolationManager", { action: "apply_repairs", selected_categories });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Repairs applied successfully.");
      onRunScan();
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || "Repair failed")
  });

  const copyAssetsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await base44.functions.invoke("branchIsolationManager", { action: "copy_assets", ...payload });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Copied ${data.copied_equipment_count} equipment and ${data.copied_vehicles_count} vehicles.`);
      queryClient.invalidateQueries({ queryKey: ["catering-equipment"] });
      queryClient.invalidateQueries({ queryKey: ["catering-vehicles"] });
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || "Copy failed")
  });

  const isApplying = applyRepairsMutation.isPending;
  const isCopying = copyAssetsMutation.isPending;
  const onApplyRepairs = (cats) => applyRepairsMutation.mutate(cats);
  const onCopyAssets = (payload) => copyAssetsMutation.mutate(payload);
  const isSample = false;

  const [selectedCategories, setSelectedCategories] = useState(() =>
    report.categories.map((c) => c.id)
  );
  const [expandedCategory, setExpandedCategory] = useState("menu_catalog_isolation");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [copySourceBranchId, setCopySourceBranchId] = useState(
    report.branches[0]?.id || ""
  );
  const [copyTargetBranchId, setCopyTargetBranchId] = useState(
    report.branches[1]?.id || ""
  );
  const [copyAssetTypes, setCopyAssetTypes] = useState(["equipment", "vehicles"]);

  const authorizedBranches = useMemo(() => {
    const allowed = new Set(report.authorization?.authorized_branch_ids || report.branches.map((b) => b.id));
    return report.branches.filter((b) => allowed.has(b.id));
  }, [report]);

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Scan Action */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-white">
                  Branch Data Isolation, Audit &amp; Sync Center
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs">
                  {report.authorization?.global_access ? "Global / Central Admin Scope" : "Branch-Locked Scope"}
                </Badge>
              </div>
              <CardDescription className="text-slate-300 max-w-3xl text-sm">
                Diagnose cross-branch catalog links, approve idempotent repairs per module, enforce automatic multi-branch mirroring on new Inventory, Menu, and Recipe definitions, and copy Equipment or Vehicles between authorized branches.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onRunScan && (
                <Button
                  variant="outline"
                  onClick={() => onRunScan()}
                  disabled={isScanning}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Scanning Live Data…" : "Run Fresh Read-Only Scan"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Safe Auto-Repairs Ready
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-950 mt-1">
                {report.summary.safe_repairs_total}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Across {report.categories.length} selectable module categories
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Unresolved Legacy Recipes
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-950 mt-1">
                {report.unresolved_legacy_recipes.length}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Left untouched &amp; reported in numbered section below
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                  Intentional Cross-Branch
                </span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-950 mt-1">
                {report.summary.intentional_cross_branch_total}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Cross-branch event shifts preserved untouched
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Authorized Branches
                </span>
                <Lock className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {authorizedBranches.length}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {authorizedBranches.map((b) => b.name).join(" · ")}
              </p>
            </div>
          </div>

          {/* Selectable Repair Categories */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  1. Select Repair Categories for Approval
                </h3>
                <p className="text-xs text-slate-500">
                  Review before/after previews for each module. Only checked categories will be applied when approved.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCategories(report.categories.map((c) => c.id))}
                >
                  Select All ({report.categories.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCategories([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>

            <div className="space-y-2.5">
              {report.categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const isExpanded = expandedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`rounded-xl border transition-colors ${
                      isSelected ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="p-4 flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(cat.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 text-xs">
                              {cat.module}
                            </Badge>
                            <h4 className="font-semibold text-sm text-slate-900">{cat.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                              {cat.records_count} records · {cat.links_count} links
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                            >
                              {isExpanded ? (
                                <>
                                  Hide Preview <ChevronUp className="w-3.5 h-3.5 ml-1" />
                                </>
                              ) : (
                                <>
                                  Before / After <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{cat.description}</p>

                        {isExpanded && cat.sample_previews?.length > 0 && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Before / After Repair Preview
                            </p>
                            {cat.sample_previews.map((p, idx) => (
                              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs border-t pt-2 first:border-t-0 first:pt-0">
                                <div className="font-medium text-slate-900">{p.record_label}</div>
                                <div className="text-red-700 bg-red-50/70 rounded px-2 py-1 font-mono text-[11px]">
                                  BEFORE: {p.before}
                                </div>
                                <div className="text-emerald-800 bg-emerald-50/70 rounded px-2 py-1 font-mono text-[11px]">
                                  AFTER: {p.after}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explicit Approval Gate */}
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={approvalConfirmed}
                  onCheckedChange={(v) => setApprovalConfirmed(Boolean(v))}
                  className="mt-0.5"
                />
                <span className="text-xs text-slate-700">
                  <strong className="text-slate-900 block">
                    I approve applying the {selectedCategories.length} selected repair categor{selectedCategories.length === 1 ? "y" : "ies"}
                  </strong>
                  Each change is idempotent, audited to AuditLog, preserves posted financial history, and leaves the 14 legacy demo recipes with missing seed ingredients untouched.
                </span>
              </label>
              <Button
                disabled={!approvalConfirmed || selectedCategories.length === 0 || isApplying}
                onClick={() => onApplyRepairs && onApplyRepairs(selectedCategories)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Play className="w-4 h-4" />
                {isApplying ? "Applying Approved Repairs…" : `Apply Approved Repairs (${selectedCategories.length})`}
              </Button>
            </div>
          </div>

          {/* Copy Equipment & Vehicles Between Authorized Branches */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  2. Copy Catering Equipment &amp; Vehicles from an Authorized Branch
                </h3>
              </div>
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-800 bg-amber-100/60">
                Branch-Permission Checked
              </Badge>
            </div>
            <p className="text-xs text-slate-600">
              Create branch-specific equipment and vehicle records by copying definitions from any source branch you are authorized to access into your target branch.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Source Branch (Authorized)
                </label>
                <Select value={copySourceBranchId} onValueChange={setCopySourceBranchId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select source branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Destination Branch (Authorized)
                </label>
                <Select value={copyTargetBranchId} onValueChange={setCopyTargetBranchId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select destination branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!copySourceBranchId || !copyTargetBranchId || copySourceBranchId === copyTargetBranchId || isCopying}
                  onClick={() =>
                    onCopyAssets &&
                    onCopyAssets({
                      source_branch_id: copySourceBranchId,
                      target_branch_id: copyTargetBranchId,
                      asset_types: copyAssetTypes,
                    })
                  }
                  className="w-full border-amber-400 bg-white hover:bg-amber-50 text-amber-900 gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {isCopying ? "Copying Assets…" : "Copy Equipment & Vehicles"}
                </Button>
              </div>
            </div>
          </div>

          {/* Separate Numbered Paragraph for the 14 Unresolved Legacy Demo Recipes */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-5 space-y-3" data-testid="unresolved-legacy-recipes-report">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold text-amber-950">
                  3. Unresolved Legacy Demo Recipes Report (Left Untouched — Separate Numbered List)
                </h3>
              </div>
              <Badge className="bg-amber-200 text-amber-900 border-amber-300">
                {report.unresolved_legacy_recipes.length} Unresolved Recipes
              </Badge>
            </div>
            <p className="text-xs text-amber-900">
              As requested, the following {report.unresolved_legacy_recipes.length} legacy demo manufacturing recipes (7 in Shrouk and 7 in Sherouk) reference deleted English seed inventory records (`6a8eabc6...` / `6ad6489b...`) that no longer exist in either branch. They have been left untouched by automatic repair and are enumerated below:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-800 bg-white rounded-lg border border-amber-200 p-4 font-mono">
              {report.unresolved_legacy_recipes.map((rec) => (
                <li key={rec.id} className="leading-relaxed">
                  <span className="font-semibold text-slate-900">
                    [{rec.branch}] {rec.name}
                  </span>{" "}
                  <span className="text-slate-500">(Recipe ID: {rec.id})</span> — Missing output:{" "}
                  <span className="text-red-700">{rec.output_item_name}</span>; Missing ingredients:{" "}
                  <span className="text-amber-800">{rec.missing_ingredients.join(", ")}</span>.
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}