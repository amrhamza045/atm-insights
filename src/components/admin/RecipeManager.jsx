import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FlaskConical, X, Loader2, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { logSuccess, logFailure } from "@/components/utils/auditLogHelper";
import IngredientPicker from "@/components/admin/recipe/IngredientPicker";
import OutputItemPicker from "@/components/admin/recipe/OutputItemPicker";
import CreateOutputItemDialog from "@/components/admin/recipe/CreateOutputItemDialog";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import usePaginatedRecipes, { buildRecipesServerQuery } from "@/components/admin/recipe/usePaginatedRecipes";
import UnitFuzzySelect from "@/components/inventory/UnitFuzzySelect";
import { computeIngredientCost, toStockQuantity, getItemStockUnit, normalizeUnit } from "@/lib/unitConversion";

export default function RecipeManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [syncingMenu, setSyncingMenu] = useState(false);
  const listTopRef = useRef(null);
  const queryClient = useQueryClient();

  const { selectedBranchId, selectedBranch } = useBranch();

  const invalidateRecipeQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recipes"] }),
      queryClient.invalidateQueries({ queryKey: ["productionAllRecipes"] }),
    ]);

  const handleSyncFromMenu = async () => {
    setSyncingMenu(true);
    try {
      const res = await base44.functions.invoke("syncMenuItemRecipe", {
        sync_all: true,
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null,
      });
      if (res.data?.error) throw new Error(res.data.error);
      await Promise.all([
        invalidateRecipeQueries(),
        queryClient.invalidateQueries({ queryKey: ["menuItems"] }),
        queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }),
      ]);
      const created = res.data?.created_count || 0;
      const updated = res.data?.updated_count || 0;
      const skipped = res.data?.skipped_count || 0;
      const failed = res.data?.failed_count || 0;
      const parts = [`${created} created`, `${updated} updated`];
      if (skipped > 0) parts.push(`${skipped} skipped`);
      if (failed > 0) parts.push(`${failed} failed`);
      toast.success(`Sync complete: ${parts.join(", ")}`);
    } catch (error) {
      toast.error(`Sync failed: ${error?.response?.data?.error || error.message}`);
    } finally {
      setSyncingMenu(false);
    }
  };

  const {
    recipes,
    totalCount,
    page,
    totalPages,
    pageSize,
    hasNextPage,
    hasPrevPage,
    isLoading,
    isFetchingPage,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = usePaginatedRecipes({ branchId: selectedBranchId });

  const { data: lookupRecipes = recipes } = useQuery({
    queryKey: ["recipes", "lookup", selectedBranchId],
    enabled: showForm,
    queryFn: async () => {
      const res = await base44.entities.Recipe.filter(buildRecipesServerQuery(selectedBranchId), {
        sort: "-created_date",
        limit: 500,
      });
      return res?.items || [];
    },
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.InventoryItem.list("name", 1000);
      if (!selectedBranchId) return all;
      return all.filter((i) => i.branch_id === selectedBranchId);
    },
  });

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["kitchenBarEmployees", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.Employee.filter(
        { status: "active" },
        "name"
      );
      return all.filter((emp) => {
        const dept = (emp.department || "").toLowerCase();
        return dept.includes("kitchen") || dept.includes("bar");
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: (_, id) => {
      logSuccess("delete", "Recipe", `Deleted recipe`, { entityId: id });
      invalidateRecipeQueries();
      toast.success("Recipe deleted");
    },
    onError: (error) => {
      logFailure("delete", "Recipe", "Failed to delete recipe", error.message);
      toast.error("Failed to delete recipe");
    },
  });

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  const handleDelete = (recipe) => {
    if (confirm(`Delete recipe "${recipe.name}"?`)) {
      deleteMutation.mutate(recipe.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div ref={listTopRef} className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">
          Showing <strong>{recipes.length}</strong> of <strong>{totalCount}</strong> recipe(s) defined · Menu Item recipes are the authoritative source of truth
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncFromMenu} disabled={syncingMenu} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncingMenu ? "animate-spin" : ""}`} /> Sync from Menu Items
          </Button>
          <Button onClick={() => { setEditingRecipe(null); setShowForm(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Create Sub-Recipe
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <Card className="p-8 text-center">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">No recipes yet</p>
          <p className="text-sm text-slate-400">Create a recipe to define how your products are made</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <motion.div
            key={`recipes-page-${page}-${selectedBranchId || "all"}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="grid gap-3 md:grid-cols-2"
          >
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{recipe.name}</h3>
                      {recipe.recipe_source === "menu_item" && (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px]">
                          Synced from Menu
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      <Package className="w-3 h-3 inline mr-1" />
                      Produces: {recipe.output_item_name || "N/A"} × {recipe.output_quantity} {recipe.output_unit || ""}
                    </p>
                  </div>
                  <Badge variant={recipe.status === "active" ? "default" : "secondary"}>
                    {recipe.status}
                  </Badge>
                </div>
                {recipe.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{recipe.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>{(recipe.ingredients || []).length} ingredient(s)</span>
                  {recipe.total_cost > 0 && (
                    <span className="font-medium text-slate-700">
                      Cost/batch: {recipe.total_cost.toFixed(2)} EGP
                    </span>
                  )}
                  {recipe.product_owner_name && (
                    <span className="text-slate-600">Owner: {recipe.product_owner_name}</span>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(recipe)} className="gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(recipe)} className="gap-1 text-red-600 hover:text-red-700">
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </motion.div>

          <EventsPaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            currentCount={recipes.length}
            totalCount={totalCount}
            itemLabel="recipes"
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            isFetchingPage={isFetchingPage}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
            onGoToPage={goToPage}
            scrollTargetRef={listTopRef}
          />
        </div>
      )}

      {showForm && (
        <RecipeFormDialog
          recipe={editingRecipe}
          inventoryItems={inventoryItems}
          recipes={lookupRecipes}
          unitRules={unitRules}
          employees={employees}
          branchId={selectedBranchId}
          branchName={selectedBranch?.name}
          onClose={() => { setShowForm(false); setEditingRecipe(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingRecipe(null);
            invalidateRecipeQueries();
          }}
        />
      )}
    </div>
  );
}

function RecipeFormDialog({ recipe, inventoryItems, recipes = [], unitRules = [], employees, branchId, branchName, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const isEditing = !!recipe;
  // Inventory item id -> active recipe that produces it (other than this one)
  const subByOutput = Object.fromEntries(
    recipes.filter((r) => r.status === "active" && r.output_item_id && r.id !== recipe?.id).map((r) => [r.output_item_id, r])
  );

  const [form, setForm] = useState({
    name: recipe?.name || "",
    description: recipe?.description || "",
    output_item_id: recipe?.output_item_id || "",
    output_item_name: recipe?.output_item_name || "",
    output_quantity: recipe?.output_quantity || 1,
    output_unit: normalizeUnit(recipe?.output_unit) || recipe?.output_unit || "",
    ingredients: (recipe?.ingredients || []).map((ing) => ({
      ...ing,
      unit: normalizeUnit(ing.unit) || ing.unit || "",
    })),
    notes: recipe?.notes || "",
    product_owner_id: recipe?.product_owner_id || "",
    product_owner_name: recipe?.product_owner_name || "",
    status: recipe?.status || "active",
    branch_id: recipe?.branch_id || branchId || null,
    branch_name: recipe?.branch_name || branchName || null,
  });

  const [saving, setSaving] = useState(false);
  const [createName, setCreateName] = useState(null);
  const selectOutput = (item) => {
    const itemUnit = normalizeUnit(item.selling_unit_label || item.unit || "");
    setForm((prev) => ({
      ...prev,
      output_item_id: item.id,
      output_item_name: item.name,
      output_unit: prev.output_unit || itemUnit || "",
    }));
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const addIngredient = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { inventory_item_id: "", inventory_item_name: "", quantity_needed: 1, unit: "" }],
    }));
  };

  const updateIngredient = (idx, field, value) => {
    setForm((prev) => {
      const ingredients = [...prev.ingredients];
      ingredients[idx] = { ...ingredients[idx], [field]: value };
      if (field === "inventory_item_id") {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) {
          ingredients[idx].inventory_item_name = item.name;
          const itemUnit = item.selling_unit_label || item.unit || "";
          ingredients[idx].unit = normalizeUnit(itemUnit) || itemUnit;
        }
      }
      return { ...prev, ingredients };
    });
  };

  const removeIngredient = (idx) => {
    setForm((prev) => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Recipe name is required");
    if (!form.output_item_id) return toast.error("Select or create an output product");
    if (form.ingredients.length === 0) return toast.error("Add at least one ingredient");
    if (form.ingredients.some((i) => i.inventory_item_id === form.output_item_id)) {
      return toast.error("A recipe can't use its own output as an ingredient");
    }
    // Circular check: no sub-recipe chain may lead back to this recipe's output
    const reaches = (rec, seen) => (rec.ingredients || []).some((ing) => {
      if (ing.inventory_item_id === form.output_item_id) return true;
      const sub = subByOutput[ing.inventory_item_id];
      if (!sub || seen.has(sub.id)) return false;
      seen.add(sub.id);
      return reaches(sub, seen);
    });
    const loop = form.ingredients.map((i) => subByOutput[i.inventory_item_id]).find((sub) => sub && reaches(sub, new Set([sub.id])));
    if (loop) return toast.error(`Circular recipe: "${loop.name}" already uses this recipe's output`);

    // Calculate cost per batch using unit-aware conversion (sub-recipe items fall back to their recipe cost)
    let totalCost = 0;
    for (const ing of form.ingredients) {
      const item = inventoryItems.find((i) => i.id === ing.inventory_item_id);
      const sub = subByOutput[ing.inventory_item_id];
      const subCostPerUnit = sub ? (Number(sub.total_cost) || 0) / (Number(sub.output_quantity) || 1) : null;
      const stockConv = item ? toStockQuantity(Number(ing.quantity_needed) || 0, ing.unit || getItemStockUnit(item), item, unitRules) : { ok: true };
      if (!stockConv.ok) {
        return toast.error(`Missing unit conversion for ${item?.name || "ingredient"}: ${stockConv.message}`);
      }
      const costRes = computeIngredientCost(Number(ing.quantity_needed) || 0, ing.unit || getItemStockUnit(item), item, unitRules, subCostPerUnit);
      if (costRes.ok) {
        totalCost += costRes.totalCost;
      } else {
        const fallbackUnitCost = item?.cost_per_unit || subCostPerUnit || 0;
        totalCost += fallbackUnitCost * (Number(ing.quantity_needed) || 0);
      }
    }
    totalCost = Math.round(totalCost * 10000) / 10000;

    setSaving(true);
    try {
      const payload = { ...form, output_quantity: Number(form.output_quantity), total_cost: totalCost };
      let saved;
      if (isEditing) {
        saved = await base44.entities.Recipe.update(recipe.id, payload);
        logSuccess("update", "Recipe", `Updated recipe: ${form.name}`, { entityId: recipe.id, entityName: form.name });
      } else {
        const user = await base44.auth.me();
        payload.created_by = user?.email;
        saved = await base44.entities.Recipe.create(payload);
        if (saved?.id) {
          await base44.functions
            .invoke("branchIsolationManager", {
              action: "mirror_recipe",
              recipe_id: saved.id,
            })
            .catch(() => {});
        }
        logSuccess("create", "Recipe", `Created recipe: ${form.name}`, { entityId: saved.id, entityName: form.name });
      }
      toast.success(isEditing ? "Recipe updated" : "Recipe created and mirrored across branches");
      onSaved();
    } catch (error) {
      logFailure(isEditing ? "update" : "create", "Recipe", `Failed: ${error.message}`, error.message);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Recipe" : "Create Recipe"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Recipe Name *</Label>
              <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Pizza Dough" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="How is this product made?" rows={2} />
          </div>

          <div>
            <Label>Product Owner</Label>
            <Select value={form.product_owner_id || ""} onValueChange={(v) => {
              const emp = employees.find((e) => e.id === v);
              updateField("product_owner_id", v);
              updateField("product_owner_name", emp?.name || "");
            }}>
              <SelectTrigger><SelectValue placeholder="Select kitchen/bar staff" /></SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} {emp.department ? `(${emp.department})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-3 bg-blue-50/50 space-y-3">
            <h4 className="text-sm font-semibold text-blue-900">Output (Finished Product)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 md:col-span-1">
                <Label>Product *</Label>
                <OutputItemPicker
                  value={form.output_item_id}
                  valueName={form.output_item_name}
                  branchId={form.branch_id}
                  onSelect={selectOutput}
                  onCreate={setCreateName}
                />
                {createName !== null && (
                  <CreateOutputItemDialog
                    initialName={createName}
                    initialUnit={form.output_unit}
                    branchId={form.branch_id}
                    branchName={form.branch_name}
                    onClose={() => setCreateName(null)}
                    onCreated={(item) => {
                      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
                      queryClient.invalidateQueries({ queryKey: ["outputItemSearch"] });
                      selectOutput(item);
                      setCreateName(null);
                    }}
                  />
                )}
              </div>
              <div>
                <Label>Qty per Batch</Label>
                <Input type="number" step="0.01" value={form.output_quantity} onChange={(e) => updateField("output_quantity", e.target.value)} />
              </div>
              <div>
                <Label>Unit</Label>
                <UnitFuzzySelect
                  value={form.output_unit || ""}
                  onChange={(v) => updateField("output_unit", v)}
                  placeholder="Search unit…"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Ingredients (per batch)</h4>
              <Button size="sm" variant="outline" onClick={addIngredient} className="gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {form.ingredients.length === 0 && (
              <p className="text-xs text-slate-400 py-2">No ingredients added yet</p>
            )}
            {form.ingredients.map((ing, idx) => {
              const selectedItem = inventoryItems.find((i) => i.id === ing.inventory_item_id);
              const sub = subByOutput[ing.inventory_item_id];
              const subCostPerUnit = sub ? (Number(sub.total_cost) || 0) / (Number(sub.output_quantity) || 1) : null;
              const stockUnit = getItemStockUnit(selectedItem);
              const stockConv = selectedItem ? toStockQuantity(Number(ing.quantity_needed) || 0, ing.unit || stockUnit, selectedItem, unitRules) : null;
              const costRes = selectedItem ? computeIngredientCost(Number(ing.quantity_needed) || 0, ing.unit || stockUnit, selectedItem, unitRules, subCostPerUnit) : null;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">
                        Ingredient
                        {sub && (
                          <span className="ml-1 text-purple-700">· sub-recipe: {sub.name}</span>
                        )}
                      </Label>
                      <IngredientPicker
                        value={ing.inventory_item_id}
                        items={inventoryItems.filter((item) => item.id !== form.output_item_id)}
                        subLabel={(item) => !!subByOutput[item.id]}
                        onSelect={(v) => updateIngredient(idx, "inventory_item_id", v)}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" step="0.01" value={ing.quantity_needed} onChange={(e) => updateIngredient(idx, "quantity_needed", e.target.value)} />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Unit</Label>
                      <UnitFuzzySelect
                        value={ing.unit || ""}
                        onChange={(v) => updateIngredient(idx, "unit", v)}
                        placeholder="Search unit…"
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeIngredient(idx)} className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {selectedItem && (
                    <div className="text-[11px] pl-1 flex flex-wrap items-center gap-2">
                      {stockConv && !stockConv.ok ? (
                        <span className="text-red-600 font-medium">⚠ {stockConv.message}</span>
                      ) : stockConv && normalizeUnit(ing.unit) !== normalizeUnit(stockUnit) ? (
                        <span className="text-emerald-700 font-mono">
                          Stock deduction: {stockConv.quantity} {stockUnit} (from {ing.quantity_needed || 0} {ing.unit})
                        </span>
                      ) : (
                        <span className="text-slate-500">Stock unit: {stockUnit}</span>
                      )}
                      {costRes?.ok && costRes.totalCost > 0 && (
                        <span className="text-slate-700 font-medium">· Est. cost: {costRes.totalCost.toFixed(2)} EGP</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {form.ingredients.length > 0 && (() => {
              let liveTotalCost = 0;
              for (const ing of form.ingredients) {
                const item = inventoryItems.find((i) => i.id === ing.inventory_item_id);
                if (!item) continue;
                const sub = subByOutput[ing.inventory_item_id];
                const subCostPerUnit = sub ? (Number(sub.total_cost) || 0) / (Number(sub.output_quantity) || 1) : null;
                const costRes = computeIngredientCost(Number(ing.quantity_needed) || 0, ing.unit || getItemStockUnit(item), item, unitRules, subCostPerUnit);
                if (costRes?.ok) liveTotalCost += costRes.totalCost;
                else liveTotalCost += (Number(item?.cost_per_unit) || subCostPerUnit || 0) * (Number(ing.quantity_needed) || 0);
              }
              return (
                <div className="mt-2 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Total Recipe Cost (All Ingredients)</span>
                  <span className="text-sm font-bold text-emerald-700">{liveTotalCost.toFixed(2)} EGP</span>
                </div>
              );
            })()}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Preparation notes..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isEditing ? "Save Changes" : "Create Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}