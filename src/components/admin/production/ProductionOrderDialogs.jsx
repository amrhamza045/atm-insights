import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { logSuccess, logFailure } from "@/components/utils/auditLogHelper";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export function CreateOrderDialog({ branchId, branchName, onClose, onCreated }) {
  const [recipeId, setRecipeId] = useState("");
  const [targetQty, setTargetQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOutOfScope, setConfirmOutOfScope] = useState(false);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes", branchId, "active"],
    queryFn: async () => {
      const all = await base44.entities.Recipe.filter({ status: "active" }, "name");
      if (!branchId) return all;
      return all.filter((r) => !r.branch_id || r.branch_id === branchId);
    },
  });

  const { data: reservedForRecipe = [] } = useQuery({
    queryKey: ["recipeEventReservations", recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const r = recipes.find((x) => x.id === recipeId);
      if (!r?.output_item_id) return [];
      return base44.entities.ProductionOrder.filter({
        recipe_id: recipeId,
        order_source: "catering",
        status: { $in: ["pending", "in_progress"] },
      });
    },
  });

  const selectedRecipe = recipes.find((r) => r.id === recipeId);
  const hasActiveCateringBatches = reservedForRecipe.length > 0;

  const handleCreate = async () => {
    if (!recipeId) return toast.error("Please select a recipe");
    if (!targetQty || targetQty < 1) return toast.error("Target quantity must be at least 1");
    if (hasActiveCateringBatches && !confirmOutOfScope) {
      return toast.error("Please confirm creating an unlinked out-of-scope batch while catering batches exist");
    }

    setSaving(true);
    try {
      const order = await base44.entities.ProductionOrder.create({
        recipe_id: recipeId,
        recipe_name: selectedRecipe?.name || "",
        output_item_id: selectedRecipe?.output_item_id || "",
        output_item_name: selectedRecipe?.output_item_name || "",
        output_unit: selectedRecipe?.output_unit || "",
        target_quantity: Number(targetQty),
        required_output_quantity: (selectedRecipe?.output_quantity || 1) * Number(targetQty),
        status: "pending",
        branch_id: branchId || null,
        branch_name: branchName || null,
        notes,
      });
      logSuccess("create", "ProductionOrder", `Created production order for ${selectedRecipe?.name}`, {
        entityId: order.id,
        entityName: selectedRecipe?.name,
      });
      toast.success("Production order created");
      onCreated();
    } catch (error) {
      logFailure("create", "ProductionOrder", `Failed: ${error.message}`, error.message);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Batch</DialogTitle>
          <DialogDescription>Select a recipe and set the target quantity to produce</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Recipe *</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger><SelectValue placeholder="Select a recipe" /></SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecipe && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <p className="text-slate-600">Produces: <strong>{selectedRecipe.output_item_name}</strong></p>
              <p className="text-slate-600">Per batch: {selectedRecipe.output_quantity} {selectedRecipe.output_unit || ""}</p>
              <p className="text-slate-600">Ingredients: {(selectedRecipe.ingredients || []).length} item(s)</p>
              <p className="text-slate-600">Est. output: <strong>{(selectedRecipe.output_quantity || 1) * Number(targetQty)} {selectedRecipe.output_unit || ""}</strong></p>
            </div>
          )}

          {hasActiveCateringBatches && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2">
              <p className="font-semibold">Out-of-scope production warning</p>
              <p>
                There {reservedForRecipe.length === 1 ? "is 1 active catering batch" : `are ${reservedForRecipe.length} active catering batches`} planned for this recipe ({reservedForRecipe.map((o) => o.catering_event_name || "Event").join(", ")}). Manual batches here are unlinked from event requisitions and consume general free stock rather than event kitchen custody.
              </p>
              <label className="flex items-center gap-2 cursor-pointer font-medium pt-1">
                <input
                  type="checkbox"
                  checked={confirmOutOfScope}
                  onChange={(e) => setConfirmOutOfScope(e.target.checked)}
                />
                I understand this is a regular non-event batch
              </label>
            </div>
          )}

          <div>
            <Label>Target Batches *</Label>
            <Input type="number" min="1" value={targetQty} onChange={(e) => setTargetQty(e.target.value)} />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteOrderDialog({ order, onClose, onSuccess }) {
  const isCatering = order.order_source === "catering" && !!order.catering_event_id;
  const { data: resolution, isLoading: loadingRecipe } = useQuery({
    queryKey: ["resolveOrderRecipe", order.id, order.recipe_id, order.output_item_id],
    queryFn: async () => {
      if (order.recipe_id) {
        const direct = await base44.entities.Recipe.get(order.recipe_id).catch(() => null);
        if (direct && (direct.ingredients || []).length > 0) {
          return { recipe: direct, source: "recipe_id", error: null };
        }
      }
      if (order.output_item_id) {
        const byOut = await base44.entities.Recipe.filter({
          output_item_id: order.output_item_id,
          status: "active",
        });
        const scoped = order.branch_id
          ? byOut.filter((r) => !r.branch_id || r.branch_id === order.branch_id)
          : byOut;
        const valid = (scoped.length > 0 ? scoped : byOut).filter(
          (r) => (r.ingredients || []).length > 0
        );
        if (valid.length === 1) {
          return { recipe: valid[0], source: "output_item_id", error: null };
        }
        if (valid.length > 1) {
          return {
            recipe: null,
            source: "ambiguous",
            error: `Multiple active recipes match output item "${order.output_item_name || order.output_item_id}". Keep only one active recipe for this output item before completing.`,
          };
        }
      }
      return {
        recipe: null,
        source: "missing",
        error: `Recipe "${order.recipe_name || order.recipe_id}" no longer exists and no unambiguous active recipe is mapped to output item "${order.output_item_name || "unknown"}". Completion is blocked so stock and custody are not misrecorded.`,
      };
    },
  });

  const recipe = resolution?.recipe || null;
  const recipeError = resolution?.error || null;
  const perBatch =
    recipe?.output_quantity || (order.required_output_quantity || 1) / (order.target_quantity || 1);
  const outputUnit = recipe?.output_unit || order.output_unit || "";
  const expectedOutput = recipe
    ? perBatch * (order.target_quantity || 1)
    : order.required_output_quantity || order.target_quantity || 1;
  const [actualQty, setActualQty] = useState("");
  React.useEffect(() => {
    if (!loadingRecipe) setActualQty(expectedOutput);
  }, [loadingRecipe, expectedOutput]);
  const [wasteNote, setWasteNote] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!recipe) {
      toast.error(recipeError || "Cannot complete batch without a valid active recipe");
      return;
    }
    setSaving(true);
    try {
      const response = await base44.functions.invoke("completeProductionOrder", {
        production_order_id: order.id,
        actual_output_quantity: Number(actualQty),
        waste_note: wasteNote,
        expiry_date: expiryDate || null,
      });
      if (response.data?.error) throw new Error(response.data.error);
      toast.success(`Production completed! Cost: ${formatCurrency(response.data?.total_cost || 0)}`);
      onSuccess();
    } catch (error) {
      const msg = error?.response?.data?.error || error.message;
      toast.error(`Failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Production Order</DialogTitle>
          <DialogDescription>
            {isCatering
              ? "Record the actual output. Ingredients will be deducted from this event's released kitchen custody and the finished output will remain in event custody (never added to general shelf inventory)."
              : "Record the actual output. Raw materials will be deducted from inventory and finished goods added automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!loadingRecipe && recipeError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Completion Blocked — Missing Valid Recipe
              </div>
              <p>{recipeError}</p>
            </div>
          )}

          {!loadingRecipe && recipe && resolution?.source === "output_item_id" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
              Resolved via unambiguous active recipe <strong>{recipe.name}</strong> for output item{" "}
              <strong>{order.output_item_name || recipe.output_item_name}</strong>.
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-slate-600">Recipe: <strong>{recipe?.name || order.recipe_name}</strong></p>
            <p className="text-slate-600">Batches: <strong>{order.target_quantity}</strong></p>
            <p className="text-slate-600">Per batch: <strong>{loadingRecipe ? "…" : `${perBatch} ${outputUnit}`}</strong></p>
            <p className="text-slate-600">Expected output: <strong>{loadingRecipe ? "…" : `${expectedOutput} ${outputUnit}`}</strong> ({perBatch} × {order.target_quantity})</p>
            {recipe && (
              <p className="text-slate-600">
                Recipe ingredients: <strong>{(recipe.ingredients || []).length} item(s)</strong>
              </p>
            )}
          </div>

          <div>
            <Label>Actual Output Quantity *</Label>
            <Input type="number" step="0.01" value={actualQty} onChange={(e) => setActualQty(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">
              Enter the actual amount produced (may differ from expected due to shrinkage/waste)
            </p>
          </div>

          <div>
            <Label>Waste / Shrinkage Notes</Label>
            <Textarea value={wasteNote} onChange={(e) => setWasteNote(e.target.value)} placeholder="e.g. 2kg lost to spillage..." rows={2} />
          </div>

          <div>
            <Label>Expiry Date (optional)</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleComplete}
            disabled={saving || loadingRecipe || !recipe || actualQty === ""}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isCatering ? "Complete into Event Custody" : "Complete & Update Inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}