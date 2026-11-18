import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Package,
  ChefHat,
  ShieldCheck,
  Loader2,
  Eye,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { buildBranchTransferPlan } from "@/lib/branchInventoryTransferPlan";

export default function BranchInventoryTransferCard() {
  const queryClient = useQueryClient();
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [showItemsPreview, setShowItemsPreview] = useState(false);
  const [showRecipesPreview, setShowRecipesPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionError, setExecutionError] = useState(null);

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branchesAllTransfer"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const { data: inventoryItems = [], isLoading: loadingInv } = useQuery({
    queryKey: ["inventoryItemsAllTransfer"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 1000),
  });

  const { data: storageLocations = [] } = useQuery({
    queryKey: ["storageLocationsAllTransfer"],
    queryFn: () => base44.entities.StorageLocation.list(),
  });

  const { data: menuItems = [], isLoading: loadingMenus } = useQuery({
    queryKey: ["menuItemsAllTransfer"],
    queryFn: () => base44.entities.MenuItem.list("-created_date", 1000),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipesAllTransfer"],
    queryFn: () => base44.entities.Recipe.list("-created_date", 1000),
  });

  // Default to Shrouk -> Sherouk when branches load
  useEffect(() => {
    if (!branches.length) return;
    if (!sourceBranchId) {
      const shrouk = branches.find((b) => (b.name || "").toLowerCase() === "shrouk");
      if (shrouk) setSourceBranchId(shrouk.id);
      else if (branches[0]) setSourceBranchId(branches[0].id);
    }
    if (!targetBranchId) {
      const sherouk = branches.find((b) => (b.name || "").toLowerCase() === "sherouk");
      if (sherouk) setTargetBranchId(sherouk.id);
      else if (branches[1]) setTargetBranchId(branches[1].id);
    }
  }, [branches, sourceBranchId, targetBranchId]);

  useEffect(() => {
    setExecutionError(null);
    setExecutionResult(null);
  }, [sourceBranchId, targetBranchId]);

  const sourceBranch = useMemo(
    () => branches.find((b) => b.id === sourceBranchId) || null,
    [branches, sourceBranchId]
  );
  const targetBranch = useMemo(
    () => branches.find((b) => b.id === targetBranchId) || null,
    [branches, targetBranchId]
  );

  const plan = useMemo(() => {
    if (!sourceBranch || !targetBranch) return null;
    return buildBranchTransferPlan({
      sourceBranch,
      targetBranch,
      inventoryItems,
      storageLocations,
      menuItems,
      recipes,
    });
  }, [sourceBranch, targetBranch, inventoryItems, storageLocations, menuItems, recipes]);

  const handleExecuteTransfer = async () => {
    if (!plan || !sourceBranch || !targetBranch) return;
    setExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);

    try {
      let data = null;
      try {
        const res = await base44.functions.invoke("transferBranchInventory", {
          source_branch_id: sourceBranch.id,
          target_branch_id: targetBranch.id,
          dry_run: false,
        });
        if (res.data?.error) throw new Error(res.data.error);
        data = res.data;
      } catch (fnErr) {
        if (fnErr?.response?.status && fnErr.response.status !== 404) {
          throw fnErr;
        }
        // Fallback to direct entity creation & relinking using the validated plan (never mutates source branch inventory)
        const createdItems = [];
        const createPayloads = plan.itemsToCopy.map((c) => c.createPayload);
        for (let i = 0; i < createPayloads.length; i += 500) {
          const batch = createPayloads.slice(i, i + 500);
          const created = await base44.entities.InventoryItem.bulkCreate(batch);
          if (Array.isArray(created)) createdItems.push(...created);
        }

        const freshInv =
          createdItems.length === createPayloads.length && createdItems.every((x) => x?.id)
            ? [...inventoryItems, ...createdItems]
            : await base44.entities.InventoryItem.list("-created_date", 1000);

        const resolvedPlan = buildBranchTransferPlan({
          sourceBranch,
          targetBranch,
          inventoryItems: freshInv,
          storageLocations,
          menuItems,
          recipes,
        });

        let updatedMenus = 0;
        for (const mUpdate of resolvedPlan.menuUpdates) {
          if (mUpdate.needsRecordWrite) {
            await base44.entities.MenuItem.update(mUpdate.menu_item_id, {
              recipe: mUpdate.nextRecipe,
            });
          }
          updatedMenus += 1;
        }
        let createdRecipes = 0;
        const recipePayloads = resolvedPlan.recipesToCreate.map((r) => r.createPayload);
        for (let i = 0; i < recipePayloads.length; i += 500) {
          const batch = recipePayloads.slice(i, i + 500);
          await base44.entities.Recipe.bulkCreate(batch);
          createdRecipes += batch.length;
        }
        let updatedRecipes = 0;
        for (let i = 0; i < resolvedPlan.recipesToUpdate.length; i += 500) {
          const batch = resolvedPlan.recipesToUpdate.slice(i, i + 500);
          await base44.entities.Recipe.bulkUpdate(batch);
          updatedRecipes += batch.length;
        }
        data = {
          copied_inventory_count: createPayloads.length,
          moved_inventory_count: createPayloads.length,
          already_in_target_count: plan.summary.itemsAlreadyInTargetCount,
          updated_menu_items_count: updatedMenus,
          relinked_ingredients_count: resolvedPlan.summary.relinkedIngredientsCount,
          created_recipes_count: createdRecipes,
          updated_recipes_count: createdRecipes + updatedRecipes,
        };
      }

      setExecutionResult(data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventoryItemsAllTransfer"] }),
        queryClient.invalidateQueries({ queryKey: ["menuItemsAllTransfer"] }),
        queryClient.invalidateQueries({ queryKey: ["recipesAllTransfer"] }),
        queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }),
        queryClient.invalidateQueries({ queryKey: ["inventoryItemsAll"] }),
        queryClient.invalidateQueries({ queryKey: ["menuItems"] }),
        queryClient.invalidateQueries({ queryKey: ["recipes"] }),
      ]);
      toast.success(
        `Coded ${data?.copied_inventory_count ?? data?.moved_inventory_count ?? 0} inventory item(s) in ${targetBranch.name} (0 stock) and verified ${data?.relinked_ingredients_count || 0} recipe ingredient links.`
      );
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Transfer failed";
      setExecutionError(msg);
      toast.error(msg);
    } finally {
      setExecuting(false);
    }
  };

  const isLoading = loadingBranches || loadingInv || loadingMenus;

  return (
    <Card className="border-emerald-200 bg-white shadow-sm">
      <CardHeader className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 border-b border-emerald-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-slate-900">
                Branch Inventory Coding &amp; Recipe Relations Copy
              </CardTitle>
              <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300">
                Zero-Stock Item Coding
              </Badge>
            </div>
            <CardDescription className="mt-1 text-slate-600">
              Code (copy) active inventory item definitions from a source branch (e.g. Shrouk) into a destination branch (e.g. Sherouk) with 0 stock and identical category, supplier, unit, storage, and recipe relations — leaving the source branch and its stock untouched.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Source & Destination Branch Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg border bg-slate-50/70 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Source Branch (Copy Item Definitions From — Stock Untouched)
            </label>
            <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select source branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({inventoryItems.filter((i) => i.branch_id === b.id && i.is_active !== false).length} active items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3.5 rounded-lg border bg-emerald-50/40 border-emerald-200 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Destination Branch (Code Items With 0 Stock &amp; Link Recipes)
            </label>
            <Select value={targetBranchId} onValueChange={setTargetBranchId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select destination branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({inventoryItems.filter((i) => i.branch_id === b.id && i.is_active !== false).length} active items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sourceBranchId && targetBranchId && sourceBranchId === targetBranchId && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Please select two different branches to preview the inventory transfer and recipe relinking.
          </div>
        )}

        {isLoading && (
          <div className="py-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing branch inventory and menu recipes…
          </div>
        )}

        {!isLoading && plan && (
          <div className="space-y-4">
            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Items to Code (0 Stock)
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {plan.summary.itemsToCopyCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Copied to {plan.targetBranch.name} · {plan.sourceBranch.name} kept intact
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Existing Target Matches
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {plan.summary.itemsAlreadyInTargetCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reused without duplicating
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                  Menu Recipes Verified
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {plan.summary.affectedMenuItemsCount || plan.summary.alreadyLinkedMenusCount || 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {plan.summary.relinkedIngredientsCount || plan.summary.alreadyLinkedIngredientsCount || 0} ingredient links matched
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Unresolved / Ambiguous
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {plan.summary.unresolvedIngredientsCount + plan.summary.ambiguousInventoryCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {plan.summary.unresolvedIngredientsCount === 0 && plan.summary.ambiguousInventoryCount === 0
                    ? "100% unambiguous match"
                    : "Requires operator review"}
                </p>
              </div>
            </div>

            {/* Unresolved / Ambiguous Warning Panel if any exist */}
            {(plan.unresolvedRecipeLinks.length > 0 || plan.ambiguousInventoryItems.length > 0) && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Items Requiring Review Before Silent Reassignment
                </div>
                {plan.ambiguousInventoryItems.map((amb, i) => (
                  <div key={`amb-inv-${i}`} className="text-xs text-amber-800 bg-white/80 p-2 rounded border border-amber-200">
                    <strong>Inventory: {amb.sourceItem.name}</strong> — {amb.reason}
                  </div>
                ))}
                {plan.unresolvedRecipeLinks.map((unres, i) => (
                  <div key={`unres-rec-${i}`} className="text-xs text-amber-800 bg-white/80 p-2 rounded border border-amber-200 flex items-center justify-between gap-2">
                    <span>
                      <strong>Menu Item &ldquo;{unres.menu_item_name}&rdquo;</strong> → Ingredient &ldquo;{unres.inventory_item_name}&rdquo;: {unres.reason}
                    </span>
                    <Badge variant="outline" className="text-amber-800 border-amber-300">
                      {unres.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Collapsible Preview of Inventory Items to Move & Recipe Links */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowItemsPreview((v) => !v)}
                className="gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                {showItemsPreview ? "Hide" : "Preview"} Inventory Items ({plan.itemsToCopy.length} to code, {plan.itemsAlreadyInTarget.length} existing)
                {showItemsPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRecipesPreview((v) => !v)}
                className="gap-1.5"
              >
                <ChefHat className="w-3.5 h-3.5" />
                {showRecipesPreview ? "Hide" : "Preview"} Recipe Ingredient Links ({plan.recipeLinkDetails.length})
                {showRecipesPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {showItemsPreview && (
              <div className="rounded-lg border bg-slate-50/60 overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-100 border-b text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Item Definitions to Code in {plan.targetBranch.name} (0 Stock · {plan.sourceBranch.name} Stock Kept Intact)</span>
                  <span>Showing {Math.min(50, plan.itemsToCopy.length)} of {plan.itemsToCopy.length}</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-200/70 text-xs">
                  {plan.itemsToCopy.slice(0, 50).map(({ sourceItem, targetStorageLocationName }) => (
                    <div key={sourceItem.id} className="px-3.5 py-2 bg-white flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-900">{sourceItem.name}</span>
                        {sourceItem.category_name && (
                          <span className="ml-2 text-slate-500">({sourceItem.category_name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>
                          New {plan.targetBranch.name} Stock: <strong>0</strong> {sourceItem.selling_unit_label || sourceItem.unit || "pcs"} (Source: {sourceItem.quantity ?? 0} stays in {plan.sourceBranch.name})
                        </span>
                        {targetStorageLocationName && (
                          <Badge variant="secondary" className="text-[10px]">
                            Storage: {targetStorageLocationName}
                          </Badge>
                        )}
                        <Badge className="bg-emerald-600 text-[10px]">
                          Code Copy in {plan.targetBranch.name}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {plan.itemsToCopy.length === 0 && (
                    <div className="p-4 text-center text-slate-500">
                      All active inventory items from {plan.sourceBranch.name} are already coded in {plan.targetBranch.name}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {showRecipesPreview && (
              <div className="rounded-lg border bg-slate-50/60 overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-100 border-b text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Menu Recipe Ingredient Links Connected to {plan.targetBranch.name}</span>
                  <span>Showing {Math.min(50, plan.recipeLinkDetails.length)} of {plan.recipeLinkDetails.length}</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-200/70 text-xs">
                  {plan.recipeLinkDetails.slice(0, 50).map((link, idx) => (
                    <div key={`${link.menu_item_id}-${idx}`} className="px-3.5 py-2 bg-white flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">{link.menu_item_name}</span>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <span className="text-slate-700">{link.new_inventory_item_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50">
                          {link.matchMethod === "copied_to_target"
                            ? `Linked to New ${plan.targetBranch.name} Copy`
                            : `Relinked (${link.matchMethod})`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {plan.recipeLinkDetails.length === 0 && (
                    <div className="p-4 text-center text-slate-500">
                      All menu item recipe ingredients are already linked to {plan.targetBranch.name}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execution Error */}
            {executionError && (
              <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Coding &amp; Relinking Error
                </p>
                <p>{executionError}</p>
              </div>
            )}

            {/* Execution Result */}
            {executionResult && (
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/80 text-sm text-emerald-900 space-y-1">
                <p className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Item Coding &amp; Recipe Relations Complete
                </p>
                <p className="text-xs text-emerald-800">
                  Coded <strong>{executionResult.copied_inventory_count ?? executionResult.moved_inventory_count ?? 0}</strong> item definition(s) in{" "}
                  <strong>{plan.targetBranch.name}</strong> with 0 stock (leaving {plan.sourceBranch.name} stock untouched), matched{" "}
                  <strong>{executionResult.already_in_target_count || 0}</strong> existing target item(s), updated{" "}
                  <strong>{executionResult.updated_menu_items_count}</strong> menu item recipe(s) ({executionResult.relinked_ingredients_count} ingredient links verified), and synced{" "}
                  <strong>{executionResult.updated_recipes_count || 0}</strong> manufacturing recipe(s) in {plan.targetBranch.name}.
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <p className="text-xs text-slate-500">
                Codes item definitions in {plan.targetBranch.name} with 0 stock and the same category, supplier, unit, storage, and recipe relations without moving {plan.sourceBranch.name}&apos;s items or stock.
              </p>
              <Button
                onClick={handleExecuteTransfer}
                disabled={
                  executing ||
                  (plan.summary.itemsToCopyCount === 0 && plan.summary.idChangedIngredientsCount === 0 && plan.summary.manufacturingRecipesToUpdateCount === 0)
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Coding &amp; Linking…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Code Items &amp; Link Relations ({plan.summary.itemsToCopyCount} new items)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}