import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { GRADE_OPTIONS, fmtMoney, fmtNum } from "./shared";
import ReworkWasteDialog from "./ReworkWasteDialog";

const REWORK_TYPES = [
  { value: "deboning", label: "Deboning", desc: "Removing bones from primal/sub-primal cuts", prefix: "Deboned" },
  { value: "trimming", label: "Trimming", desc: "Cutting excess fat, silver skin, and connective tissue", prefix: "Trimmed" },
  { value: "grinding", label: "Grinding", desc: "Producing ground meat / mince from trimmings", prefix: "Ground" },
  { value: "portioning", label: "Portioning", desc: "Cutting into specific portion sizes (steaks, chops)", prefix: "Portioned" },
  { value: "cubing", label: "Cubing", desc: "Cutting into cubes for stew, kebab, or curry", prefix: "Cubed" },
  { value: "slicing", label: "Slicing", desc: "Cutting into slices or strips (stir-fry, schnitzel)", prefix: "Sliced" },
  { value: "rendering", label: "Rendering", desc: "Rendering fat into tallow or lard", prefix: "Rendered" },
  { value: "other", label: "Other", desc: "Custom rework operation (specify)", prefix: "" },
];

const reworkTypeLabel = (ev) => {
  if (ev.rework_type === "other" && ev.rework_type_custom) return ev.rework_type_custom;
  const found = REWORK_TYPES.find((t) => t.value === ev.rework_type);
  return found ? found.label : "Rework";
};

export default function ReworkManager() {
  const [showForm, setShowForm] = useState(false);
  const [showWaste, setShowWaste] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["reworkEvents"],
    queryFn: () => base44.entities.ReworkEvent.list("-created_date"),
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button onClick={() => setShowWaste(true)} variant="outline" className="gap-2 border-red-300 text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Record Waste
        </Button>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> New Rework
        </Button>
      </div>
      {events.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No rework events yet. Rework allows re-cutting existing SKUs into new ones while preserving lot traceability.</Card>
      ) : (
        <div className="grid gap-2">
          {events.map((ev) => (
            <Card key={ev.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-slate-900">{ev.date}</h4>
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full capitalize">{reworkTypeLabel(ev)}</span>
                    <span className="text-xs text-slate-400">{ev.lot_chain?.length || 0} lot(s) in chain</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-slate-400">In:</span>
                      {ev.input_sku_names?.map((n, i) => (
                        <span key={i} className="bg-slate-100 px-1.5 rounded">{n} ({fmtNum(ev.input_quantities?.[i])})</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <ArrowRight className="w-3 h-3 text-red-500" />
                      {ev.output_sku_names?.map((n, i) => (
                        <span key={i} className="bg-green-50 text-green-700 px-1.5 rounded">{n} ({fmtNum(ev.output_quantities?.[i])})</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="text-slate-500">Input: {fmtMoney(ev.input_total_cost)}</p>
                  <p className="text-slate-500">Labor: {fmtMoney(ev.labor_cost)}</p>
                  <p className="font-medium text-slate-700">Total: {fmtMoney(ev.total_output_cost)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && (
        <ReworkForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["reworkEvents"] }); queryClient.invalidateQueries({ queryKey: ["butcheryRawMaterials"] }); }} />
      )}
      {showWaste && (
        <ReworkWasteDialog onClose={() => setShowWaste(false)} onSaved={() => { setShowWaste(false); queryClient.invalidateQueries({ queryKey: ["reworkEvents"] }); queryClient.invalidateQueries({ queryKey: ["butcheryRawMaterials"] }); }} />
      )}
    </div>
  );
}

function ReworkForm({ onClose, onSaved }) {
  const { selectedBranchId, selectedBranch } = useBranch();
  const [inputs, setInputs] = useState([{ sku_id: "", quantity: "" }]);
  const [outputs, setOutputs] = useState([{ item_name: "", quantity: "", unit: "kg", quality_grade: "ungraded", market_price_per_unit: "", touched: false }]);
  const [reworkType, setReworkType] = useState("deboning");
  const [reworkTypeCustom, setReworkTypeCustom] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: skus = [] } = useQuery({
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
  const inStock = skus.filter((s) => s.status === "in_stock" && (s.quantity || 0) > 0);
  const skuDisplayName = (s) =>
    (s.primal_cut_id && cutNameById[s.primal_cut_id]) ||
    (s.waste_byproduct_id && cutNameById[s.waste_byproduct_id]) ||
    s.sku_name;

  const updateInput = (i, k, v) => setInputs(inputs.map((inp, idx) => idx === i ? { ...inp, [k]: v } : inp));
  const updateOutput = (i, k, v) => setOutputs(outputs.map((out, idx) => idx === i ? { ...out, [k]: v, ...(k === "item_name" ? { touched: true } : {}) } : out));

  // Auto-fill the first output name from the rework type + first input item
  const firstInputId = inputs[0]?.sku_id;
  React.useEffect(() => {
    const src = inStock.find((s) => s.id === firstInputId);
    if (!src) return;
    const baseName = src.item_name || skuDisplayName(src);
    const t = REWORK_TYPES.find((x) => x.value === reworkType);
    const suggestion = t?.prefix ? `${t.prefix} ${baseName}` : baseName;
    setOutputs((prev) => prev.map((o, i) => (i === 0 && !o.touched ? { ...o, item_name: suggestion } : o)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstInputId, reworkType, cutNameById]);

  const handleSave = async () => {
    const validInputs = inputs.filter((i) => i.sku_id && i.quantity);
    const validOutputs = outputs.filter((o) => o.item_name && o.quantity);
    if (validInputs.length === 0) return toast.error("Add at least one valid input SKU");
    if (validOutputs.length === 0) return toast.error("Add at least one valid output SKU");
    setSaving(true);
    try {
      const res = await base44.functions.invoke("processButcheryRework", {
        date,
        rework_type: reworkType,
        rework_type_custom: reworkType === "other" ? reworkTypeCustom : "",
        inputs: validInputs.map((i) => ({ sku_id: i.sku_id, quantity: Number(i.quantity) })),
        outputs: validOutputs.map((o) => ({ item_name: o.item_name, quantity: Number(o.quantity), unit: o.unit, quality_grade: o.quality_grade, market_price_per_unit: Number(o.market_price_per_unit) || 0 })),
        labor_cost: Number(laborCost) || 0,
        notes,
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Rework complete — ${validOutputs.length} new SKU(s) created`);
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>New Rework Event</DialogTitle>
          <DialogDescription>Select input SKU(s) to consume and define new output SKU(s). Lot chain is inherited automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Labor Cost</Label><Input type="number" step="0.01" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} /></div>
          </div>

          <div>
            <Label>Rework Type *</Label>
            <Select value={reworkType} onValueChange={setReworkType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REWORK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs text-slate-400">{t.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reworkType === "other" && (
            <div><Label>Custom Rework Type *</Label><Input value={reworkTypeCustom} onChange={(e) => setReworkTypeCustom(e.target.value)} placeholder="Describe the rework operation" /></div>
          )}

          {/* Inputs */}
          <div>
            <Label>Input SKUs (consume)</Label>
            <div className="space-y-2 mt-1">
              {inputs.map((inp, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={inp.sku_id} onValueChange={(v) => updateInput(i, "sku_id", v)}>
                    <SelectTrigger className="flex-1 min-w-0 [&>span]:truncate [&>span]:text-left"><SelectValue placeholder="Select in-stock SKU" /></SelectTrigger>
                    <SelectContent className="max-w-[90vw]">
                      {inStock.map((s) => {
                        const name = skuDisplayName(s);
                        const label = name !== s.sku_name
                          ? `${name} — ${s.sku_name} (${fmtNum(s.quantity)} ${s.unit}, lot ${s.lot_number})`
                          : `${s.sku_name} (${fmtNum(s.quantity)} ${s.unit}, lot ${s.lot_number})`;
                        return <SelectItem key={s.id} value={s.id}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.01" placeholder="Qty" className="w-20 shrink-0" value={inp.quantity} onChange={(e) => updateInput(i, "quantity", e.target.value)} />
                  {inputs.length > 1 && (
                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setInputs(inputs.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-1" onClick={() => setInputs([...inputs, { sku_id: "", quantity: "" }])}><Plus className="w-3 h-3" /> Add input</Button>
          </div>

          {/* Outputs */}
          <div>
            <Label>Output SKUs (produce)</Label>
            <div className="space-y-2 mt-1">
              {outputs.map((out, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input placeholder="Output name (auto-filled)" value={out.item_name} onChange={(e) => updateOutput(i, "item_name", e.target.value)} />
                  <div className="flex gap-1">
                    <Input type="number" step="0.01" placeholder="Qty" value={out.quantity} onChange={(e) => updateOutput(i, "quantity", e.target.value)} />
                    {outputs.length > 1 && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setOutputs(outputs.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                  <Input placeholder="Unit (kg)" value={out.unit} onChange={(e) => updateOutput(i, "unit", e.target.value)} />
                  <Select value={out.quality_grade} onValueChange={(v) => updateOutput(i, "quality_grade", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-1" onClick={() => setOutputs([...outputs, { item_name: "", quantity: "", unit: "kg", quality_grade: "ungraded", market_price_per_unit: "", touched: false }])}><Plus className="w-3 h-3" /> Add output</Button>
          </div>

          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Process Rework"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}