import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { quantityChange, logStockMovements } from "@/lib/stockMovements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtNum } from "./shared";
import { logSuccess } from "@/components/utils/auditLogHelper";

export default function ReworkWasteDialog({ onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [wasteEntries, setWasteEntries] = useState({});
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const { data: skus = [], isLoading } = useQuery({
    queryKey: ["butcheryRawMaterials"],
    queryFn: () => base44.entities.ButcheryRawMaterial.list("-created_date"),
  });
  const { data: cuts = [] } = useQuery({
    queryKey: ["primalCutsAll"],
    queryFn: () => base44.entities.PrimalCut.list("-created_date"),
  });
  const { data: byproducts = [] } = useQuery({
    queryKey: ["wasteByProductsAll"],
    queryFn: () => base44.entities.WasteByProduct.list("-created_date"),
  });

  const cutNameById = useMemo(() => {
    const map = {};
    cuts.forEach((c) => { map[c.id] = c.cut_name; });
    byproducts.forEach((b) => { map[b.id] = b.name || b.category; });
    return map;
  }, [cuts, byproducts]);

  const inStock = skus.filter((s) => s.status === "in_stock" && (s.quantity || 0) > 0);

  const displayName = (s) =>
    (s.primal_cut_id && cutNameById[s.primal_cut_id]) ||
    (s.waste_byproduct_id && cutNameById[s.waste_byproduct_id]) ||
    s.sku_name;

  const setQty = (id, qty) => setWasteEntries({ ...wasteEntries, [id]: qty });
  const toggle = (id, checked) => {
    if (checked) setQty(id, "");
    else { const next = { ...wasteEntries }; delete next[id]; setWasteEntries(next); }
  };

  const handleSave = async () => {
    const entries = Object.entries(wasteEntries).filter(([, qty]) => qty && Number(qty) > 0);
    if (entries.length === 0) return toast.error("Enter waste quantity for at least one SKU");

    for (const [id, qty] of entries) {
      const sku = inStock.find((s) => s.id === id);
      if (!sku) { toast.error("SKU not found"); return; }
      if (Number(qty) > (sku.quantity || 0)) { toast.error(`Waste for ${displayName(sku)} exceeds available stock`); return; }
    }

    setSaving(true);
    try {
      for (const [id, qty] of entries) {
        const sku = inStock.find((s) => s.id === id);
        const wasteQty = Number(qty);
        const remaining = sku.quantity - wasteQty;
        await base44.entities.ButcheryRawMaterial.update(id, {
          quantity: remaining,
          status: remaining <= 0 ? "sold" : "in_stock",
          notes: `[WASTE ${date}] ${wasteQty} ${sku.unit}${reason ? ` — ${reason}` : ""}${sku.notes ? `\n${sku.notes}` : ""}`,
        });
        if (sku.inventory_item_id) {
          const inv = await base44.entities.InventoryItem.get(sku.inventory_item_id).catch(() => null);
          await base44.entities.InventoryItem.update(sku.inventory_item_id, { quantity: remaining });
          if (inv) await logStockMovements([quantityChange(inv, inv.quantity || 0, remaining, {
            key: `butchery_waste:${id}:${date}:${Date.now()}`, type: "waste", source_entity: "ButcheryRawMaterial", source_id: id,
            source_label: `Butchery waste · ${sku.sku_name}${reason ? ` · ${reason}` : ""}`,
          })]);
        }
        logSuccess("update", "ButcheryRawMaterial", `Recorded waste: ${wasteQty} ${sku.unit} from ${displayName(sku)} (${sku.sku_name})`, { entityId: id });
      }
      toast.success(`Waste recorded for ${entries.length} SKU(s)`);
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Waste</DialogTitle>
          <DialogDescription>Select one or more SKUs and enter the wasted quantity for each.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : inStock.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No in-stock SKUs available.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {inStock.map((s) => {
                const name = displayName(s);
                const checked = !!wasteEntries[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                    <input type="checkbox" checked={checked} onChange={(e) => toggle(s.id, e.target.checked)} className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.sku_name} • Lot: {s.lot_number} • Avail: {fmtNum(s.quantity)} {s.unit}</p>
                    </div>
                    {checked && (
                      <Input type="number" step="0.01" placeholder="Qty" className="w-24" value={wasteEntries[s.id]} onChange={(e) => setQty(s.id, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Reason / Notes</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spoilage" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Waste"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}