import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { quantityChange, logStockMovements } from "@/lib/stockMovements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResolveExpiryDialog({ report, mode, currentUser, open, onClose }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(report?.quantity_at_risk ?? 0);
  const [notes, setNotes] = useState("");
  const [deductStock, setDeductStock] = useState(mode === "wasted");
  const [saving, setSaving] = useState(false);

  const handleResolve = async () => {
    setSaving(true);
    try {
      const qty = Number(quantity) || 0;

      await base44.entities.ExpiryReport.update(report.id, {
        status: mode,
        resolved_quantity: qty,
        resolved_at: new Date().toISOString(),
        resolved_by_email: currentUser?.email || "",
        resolution_notes: notes
      });

      if (deductStock && report.inventory_item_id && qty > 0) {
        const item = await base44.entities.InventoryItem.get(report.inventory_item_id);
        if (item) {
          const newQty = Math.max(0, (item.quantity || 0) - qty);
          await base44.entities.InventoryItem.update(item.id, { quantity: newQty });
          await logStockMovements([quantityChange(item, item.quantity || 0, newQty, {
            key: `expiry:${report.id}`, type: mode === "used" ? "adjustment" : "expiry", source_entity: "ExpiryReport", source_id: report.id,
            source_label: `Expiry ${mode === "used" ? "used up" : "written off"} · ${report.batch_ref || ""}`.trim(), actor_email: currentUser?.email, notes,
          })]);
          queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });
          queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
          toast.success(`Stock updated: ${item.name} now ${newQty}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["expiryReports"] });
      toast.success(mode === "used" ? "Marked as used" : "Marked as wasted");
      onClose();
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Mark {mode === "used" ? "Used" : "Wasted"} — {report?.inventory_item_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Quantity {report?.unit ? `(${report.unit})` : ""}</Label>
            <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {report?.inventory_item_id && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={deductStock}
                onChange={(e) => setDeductStock(e.target.checked)}
                className="mt-1"
              />
              <span>
                Deduct this quantity from inventory stock
                {mode === "used" && (
                  <span className="block text-xs text-slate-400">
                    Leave unchecked if it was consumed through orders (already deducted).
                  </span>
                )}
              </span>
            </label>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleResolve} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}