import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { stockMovement, logStockMovements } from "@/lib/stockMovements";
import { useBranch } from "@/components/branches/BranchContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Loader2, Package, PoundSterling, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RAW_MATERIAL_STATUS_CONFIG, GRADE_OPTIONS, generateLotNumber, generateSkuNumber, fmtMoney, fmtNum, pct } from "./shared";
import { logSuccess } from "@/components/utils/auditLogHelper";
import { syncInventory, deleteLinkedInventory } from "./inventorySync";

function invalidateRmAndInventory(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["butcheryRawMaterials"] });
  queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
  queryClient.invalidateQueries({ queryKey: ["inventory"] });
}

export default function RawMaterialManager() {
  const [showForm, setShowForm] = useState(false);
  const [selling, setSelling] = useState(null);
  const [editing, setEditing] = useState(null);
  const [wasting, setWasting] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const handleDelete = async (r) => {
    if (!confirm(`Delete "${r.sku_name}"? This will also remove its linked inventory item. This cannot be undone.`)) return;
    try {
      await deleteLinkedInventory(r);
      await base44.entities.ButcheryRawMaterial.delete(r.id);
      queryClient.invalidateQueries({ queryKey: ["butcheryRawMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      toast.success("Raw material and linked inventory deleted");
    } catch (e) { toast.error(e.message); }
  };

  const { data: rawMaterials = [], isLoading } = useQuery({
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

  const cutNameById = React.useMemo(() => {
    const map = {};
    cuts.forEach((c) => { map[c.id] = c.cut_name; });
    byproducts.forEach((b) => { map[b.id] = b.name || b.category; });
    return map;
  }, [cuts, byproducts]);

  const filtered = rawMaterials.filter((r) =>
    !search || r.sku_name?.toLowerCase().includes(search.toLowerCase()) || r.item_name?.toLowerCase().includes(search.toLowerCase()) || r.lot_number?.toLowerCase().includes(search.toLowerCase()) || r.animal_tag?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by SKU, lot, or animal tag..." className="pl-9" />
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Package Raw Material
        </Button>
        <Button onClick={() => setWasting(true)} variant="outline" className="gap-2 border-red-300 text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Record Waste
        </Button>
      </div>
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No raw materials yet. Package one from a primal cut or by-product.</Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => {
            const cfg = RAW_MATERIAL_STATUS_CONFIG[r.status] || RAW_MATERIAL_STATUS_CONFIG.in_stock;
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Package className="w-4 h-4 text-slate-400" />
                      <h4 className="font-medium text-slate-900 truncate">
                        {r.item_name ||
                         (r.primal_cut_id && cutNameById[r.primal_cut_id]) ||
                         (r.waste_byproduct_id && cutNameById[r.waste_byproduct_id]) ||
                         r.sku_name}
                      </h4>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                      {r.source_type === "rework" && <Badge className="bg-purple-100 text-purple-700">Rework</Badge>}
                      {r.inventory_item_id ? (
                        <Badge className="bg-blue-100 text-blue-700">In Inventory</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Not Linked</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>Lot: {r.lot_number}</span>
                      <span>{fmtNum(r.quantity)} {r.unit}</span>
                      <span>Unit cost: {fmtMoney(r.unit_cost)}</span>
                      <Badge variant="outline" className="capitalize">{r.quality_grade}</Badge>
                      {r.animal_tag && <span>Animal: #{r.animal_tag}</span>}
                      <span className="ml-auto font-medium text-slate-700">{r.sku_name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(r)}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleDelete(r)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                      {r.status === "in_stock" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelling(r)}>
                          <PoundSterling className="w-3 h-3" /> Record Sale
                        </Button>
                      )}
                    </div>
                    {r.status === "sold" && (
                      <div className="text-right text-xs">
                        <p className="text-slate-500">Sale: {fmtMoney(r.sale_price)}</p>
                        <p className={r.actual_margin >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          Margin: {fmtMoney(r.actual_margin)} ({pct(r.margin_percentage)})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {showForm && (
        <PackageForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); invalidateRmAndInventory(queryClient); }} />
      )}
      {selling && (
        <SaleDialog rawMaterial={selling} onClose={() => setSelling(null)} onSaved={() => { setSelling(null); invalidateRmAndInventory(queryClient); }} />
      )}
      {editing && (
        <EditDialog rawMaterial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); invalidateRmAndInventory(queryClient); }} />
      )}
      {wasting && (
        <WasteDialog rawMaterials={filtered.filter((r) => r.status === "in_stock")} onClose={() => setWasting(false)} onSaved={() => { setWasting(false); invalidateRmAndInventory(queryClient); }} />
      )}
    </div>
  );
}

function PackageForm({ onClose, onSaved }) {
  const { selectedBranchId, selectedBranch } = useBranch();
  const [sourceType, setSourceType] = useState("primal_cut");
  const [sourceId, setSourceId] = useState("");
  const [form, setForm] = useState({
    sku_name: generateSkuNumber(), quantity: "", unit: "kg", quality_grade: "standard", market_price_per_unit: "", packaging_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const { data: cuts = [] } = useQuery({
    queryKey: ["primalCutsAll"],
    queryFn: () => base44.entities.PrimalCut.list("-created_date"),
  });
  const { data: byproducts = [] } = useQuery({
    queryKey: ["wasteByProductsAll"],
    queryFn: () => base44.entities.WasteByProduct.list("-created_date"),
  });

  const sources = sourceType === "primal_cut" ? cuts : byproducts.filter((b) => b.type === "by_product");
  const selectedSource = sources.find((s) => s.id === sourceId);

  const handleSave = async () => {
    if (!sourceId) return toast.error("Select a source");
    if (!form.quantity) return toast.error("Quantity required");
    setSaving(true);
    try {
      const lotNumber = generateLotNumber("BCH");
      // Fetch the slaughter event to get animal/supplier linkage
      let slaughterEventId = "", animalId = "", animalTag = "", supplierId = "", supplierName = "";
      if (sourceType === "primal_cut") {
        slaughterEventId = selectedSource?.slaughter_event_id || "";
        const evt = slaughterEventId ? await base44.entities.SlaughterEvent.get(slaughterEventId) : null;
        animalId = evt?.animal_id || "";
        animalTag = evt?.animal_tag || "";
        if (animalId) {
          const animal = await base44.entities.Animal.get(animalId);
          supplierId = animal?.supplier_id || "";
          supplierName = animal?.supplier_name || "";
        }
      } else {
        slaughterEventId = selectedSource?.slaughter_event_id || "";
        const evt = slaughterEventId ? await base44.entities.SlaughterEvent.get(slaughterEventId) : null;
        animalId = evt?.animal_id || "";
        animalTag = evt?.animal_tag || "";
        supplierId = "";
      }
      const qty = Number(form.quantity);
      const itemName = sourceType === "primal_cut"
        ? (selectedSource?.cut_name || form.sku_name)
        : (selectedSource?.name || selectedSource?.category || form.sku_name);
      const rm = await base44.entities.ButcheryRawMaterial.create({
        sku_name: form.sku_name, item_name: itemName, lot_number: lotNumber, source_type: sourceType,
        primal_cut_id: sourceType === "primal_cut" ? sourceId : "",
        waste_byproduct_id: sourceType === "by_product" ? sourceId : "",
        slaughter_event_id: slaughterEventId, animal_id: animalId, animal_tag: animalTag,
        supplier_id: supplierId, supplier_name: supplierName,
        quantity: qty, unit: form.unit, packaging_date: form.packaging_date,
        quality_grade: form.quality_grade, allocation_method: "weight",
        market_price_per_unit: Number(form.market_price_per_unit) || 0,
        status: "in_stock", allocated_cost: 0, unit_cost: 0,
      });
      // Push to inventory — use the real item name (cut/by-product), not the SKU number
      const existing = await base44.entities.InventoryItem.filter({ name: itemName });
      const match = existing.find((i) => !selectedBranchId || i.branch_id === selectedBranchId);
      let invItem;
      if (match) {
        await base44.entities.InventoryItem.update(match.id, { quantity: (match.quantity || 0) + qty, ...(match.category_name ? {} : { category_name: "Butchery" }) });
        invItem = match;
      } else {
        invItem = await base44.entities.InventoryItem.create({
          name: itemName, branch_id: selectedBranchId || null, branch_name: selectedBranch?.name || null,
          quantity: qty, unit: form.unit,
          purchase_unit: "weight", purchase_unit_label: form.unit,
          selling_unit: "weight", selling_unit_label: form.unit,
          cost_per_unit: 0, category_name: "Butchery",
        });
      }
      await base44.entities.ButcheryRawMaterial.update(rm.id, { inventory_item_id: invItem.id });
      await logStockMovements([stockMovement(invItem, {
        key: `butchery_output:${rm.id}`, direction: "in", type: "butchery_output", quantity: qty, unit: form.unit,
        before: match ? match.quantity || 0 : 0, after: match ? (match.quantity || 0) + qty : qty,
        source_entity: "ButcheryRawMaterial", source_id: rm.id, source_label: `Packaged SKU ${form.sku_name} (lot ${lotNumber})`,
      })]);
      // Link by-product back
      if (sourceType === "by_product") {
        await base44.entities.WasteByProduct.update(sourceId, { raw_material_id: rm.id });
      }
      logSuccess("create", "ButcheryRawMaterial", `Packaged SKU ${form.sku_name} (lot ${lotNumber})`, { entityId: rm.id });
      toast.success("Raw material packaged & pushed to inventory");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Package Raw Material</DialogTitle>
          <DialogDescription>Generates a lot number and pushes stock into Inventory automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Source Type</Label>
            <Select value={sourceType} onValueChange={(v) => { setSourceType(v); setSourceId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primal_cut">Primal Cut</SelectItem>
                <SelectItem value="by_product">By-Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Source *</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue placeholder={`Select ${sourceType === "primal_cut" ? "a cut" : "a by-product"}`} /></SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {sourceType === "primal_cut" ? `${s.cut_name} (${fmtNum(s.weight)} kg)` : `${s.name || s.category} (${fmtNum(s.weight)} kg)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>SKU Number *</Label><Input value={form.sku_name} readOnly className="bg-slate-50 text-slate-600 cursor-not-allowed" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity *</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => set("unit", e.target.value)} /></div>
          </div>
          <div><Label>Quality Grade</Label>
            <Select value={form.quality_grade} onValueChange={(v) => set("quality_grade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Market Price/Unit (for value-based)</Label><Input type="number" step="0.01" value={form.market_price_per_unit} onChange={(e) => set("market_price_per_unit", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Package"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WasteDialog({ rawMaterials, onClose, onSaved }) {
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const selected = rawMaterials.find((r) => r.id === selectedId);

  const handleSave = async () => {
    if (!selectedId) return toast.error("Select a raw material SKU");
    if (!quantity) return toast.error("Waste quantity required");
    const wasteQty = Number(quantity);
    if (wasteQty <= 0) return toast.error("Quantity must be greater than 0");
    if (wasteQty > (selected.quantity || 0)) return toast.error("Waste quantity exceeds available stock");
    setSaving(true);
    try {
      const remaining = selected.quantity - wasteQty;
      await base44.entities.ButcheryRawMaterial.update(selected.id, {
        quantity: remaining,
        status: remaining <= 0 ? "sold" : "in_stock",
        notes: `[WASTE ${date}] ${wasteQty} ${selected.unit}${reason ? ` — ${reason}` : ""}${selected.notes ? `\n${selected.notes}` : ""}`,
      });
      // Deduct the wasted quantity from the linked inventory item
      await syncInventory(selected, { quantityDelta: -wasteQty });
      logSuccess("update", "ButcheryRawMaterial", `Recorded waste: ${wasteQty} ${selected.unit} from ${selected.sku_name} (lot ${selected.lot_number})`, { entityId: selected.id });
      toast.success("Waste recorded & inventory updated");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Waste</DialogTitle>
          <DialogDescription>Select a raw material SKU and record the wasted quantity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Raw Material SKU *</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Choose a SKU..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {rawMaterials.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No in-stock raw materials available.</p>
                ) : rawMaterials.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.sku_name} — Lot: {r.lot_number} ({fmtNum(r.quantity)} {r.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <p className="text-slate-600">SKU: <strong>{selected.sku_name}</strong></p>
              <p className="text-slate-600">Lot: <strong>{selected.lot_number}</strong></p>
              <p className="text-slate-600">Available: <strong>{fmtNum(selected.quantity)} {selected.unit}</strong></p>
              <p className="text-slate-600">Unit cost: <strong>{fmtMoney(selected.unit_cost)}</strong></p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Waste Quantity *</Label><Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" /></div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div><Label>Reason / Notes</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spoilage, contamination, trimming" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Waste"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaleDialog({ rawMaterial, onClose, onSaved }) {
  const [form, setForm] = useState({ sale_price: "", sale_quantity: rawMaterial.quantity || "", sale_date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.sale_price) return toast.error("Sale price required");
    setSaving(true);
    try {
      const salePrice = Number(form.sale_price);
      const saleQty = Number(form.sale_quantity) || rawMaterial.quantity;
      const allocatedCost = rawMaterial.allocated_cost || 0;
      const margin = salePrice - allocatedCost;
      const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0;
      await base44.entities.ButcheryRawMaterial.update(rawMaterial.id, {
        status: "sold", sale_price: salePrice, sale_quantity: saleQty, sale_date: form.sale_date,
        actual_margin: margin, margin_percentage: marginPct,
      });
      // Deduct the sold quantity from the linked inventory item
      await syncInventory(rawMaterial, { quantityDelta: -saleQty });
      logSuccess("update", "ButcheryRawMaterial", `Sold ${rawMaterial.sku_name} — margin ${fmtMoney(margin)}`, { entityId: rawMaterial.id });
      toast.success(`Sale recorded — Margin: ${fmtMoney(margin)} (${pct(marginPct)})`);
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Sale — {rawMaterial.sku_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-slate-600">Lot: <strong>{rawMaterial.lot_number}</strong></p>
            <p className="text-slate-600">Quantity: <strong>{fmtNum(rawMaterial.quantity)} {rawMaterial.unit}</strong></p>
            <p className="text-slate-600">Allocated cost: <strong>{fmtMoney(rawMaterial.allocated_cost)}</strong></p>
            <p className="text-slate-600">Unit cost: <strong>{fmtMoney(rawMaterial.unit_cost)}</strong></p>
          </div>
          <div><Label>Sale Price *</Label><Input type="number" step="0.01" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} /></div>
          <div><Label>Quantity Sold</Label><Input type="number" step="0.01" value={form.sale_quantity} onChange={(e) => set("sale_quantity", e.target.value)} /></div>
          <div><Label>Sale Date</Label><Input type="date" value={form.sale_date} onChange={(e) => set("sale_date", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Sale"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ rawMaterial, onClose, onSaved }) {
  const [form, setForm] = useState({
    sku_name: rawMaterial.sku_name || "",
    quantity: rawMaterial.quantity ?? "",
    unit: rawMaterial.unit || "kg",
    quality_grade: rawMaterial.quality_grade || "standard",
    notes: rawMaterial.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.sku_name) return toast.error("SKU name required");
    setSaving(true);
    try {
      const newQty = Number(form.quantity) || 0;
      await base44.entities.ButcheryRawMaterial.update(rawMaterial.id, {
        sku_name: form.sku_name,
        quantity: newQty,
        unit: form.unit,
        quality_grade: form.quality_grade,
        notes: form.notes,
      });
      // Mirror quantity onto the linked inventory item (inventory keeps its real item name, not the SKU)
      await syncInventory(rawMaterial, { setQuantity: newQty, unitCost: rawMaterial.unit_cost });
      logSuccess("update", "ButcheryRawMaterial", `Edited ${form.sku_name}`, { entityId: rawMaterial.id });
      toast.success("Raw material & inventory updated");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Raw Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>SKU Name *</Label><Input value={form.sku_name} onChange={(e) => set("sku_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => set("unit", e.target.value)} /></div>
          </div>
          <div><Label>Quality Grade</Label>
            <Select value={form.quality_grade} onValueChange={(v) => set("quality_grade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}