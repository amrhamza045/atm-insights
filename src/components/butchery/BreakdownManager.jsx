import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Package, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { GRADE_OPTIONS, WASTE_CATEGORIES, fmtNum, pct, getCutsForSpecies } from "./shared";

export default function BreakdownManager() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [editingCut, setEditingCut] = useState(null);
  const [editingWaste, setEditingWaste] = useState(null);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["slaughterEvents"],
    queryFn: () => base44.entities.SlaughterEvent.list("-created_date"),
  });

  const { data: cuts = [], isLoading: cutsLoading } = useQuery({
    queryKey: ["primalCuts", selectedEvent],
    queryFn: () => selectedEvent ? base44.entities.PrimalCut.filter({ slaughter_event_id: selectedEvent }) : [],
    enabled: !!selectedEvent,
  });
  const { data: wastes = [] } = useQuery({
    queryKey: ["wasteByProducts", selectedEvent],
    queryFn: () => selectedEvent ? base44.entities.WasteByProduct.filter({ slaughter_event_id: selectedEvent }) : [],
    enabled: !!selectedEvent,
  });

  const selectedEvt = events.find((e) => e.id === selectedEvent);

  const { data: animals = [] } = useQuery({
    queryKey: ["butcheryAnimals"],
    queryFn: () => base44.entities.Animal.list("-created_date", 500),
  });

  const selectedAnimal = selectedEvt?.animal_id ? animals.find((a) => a.id === selectedEvt.animal_id) : null;
  const selectedSpecies = selectedAnimal?.species || "cattle";

  const filteredCuts = filter === "all" || filter === "waste" ? cuts : cuts;
  const filteredWastes = filter === "all" || filter === "cuts" ? wastes : wastes;
  const showCuts = filter !== "waste";
  const showWastes = filter !== "cuts";

  return (
    <div className="space-y-3">
      <div>
        <Label>Select Slaughter Event</Label>
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger><SelectValue placeholder="Choose an event to manage breakdown" /></SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>#{e.animal_tag} — {e.date || "—"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEvent ? (
        <Card className="p-8 text-center text-slate-400">Select a slaughter event to manage primal cuts and waste.</Card>
      ) : (
        <>
          {selectedEvt && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-slate-500">Cold Carcass:</span> <strong>{fmtNum(selectedEvt.cold_carcass_weight)} kg</strong></div>
              <div><span className="text-slate-500">Dressing:</span> <strong>{pct(selectedEvt.dressing_percentage)}</strong></div>
              <div><span className="text-slate-500">Cuts Weight:</span> <strong>{fmtNum(cuts.reduce((s, c) => s + (c.weight || 0), 0))} kg</strong></div>
              <div><span className="text-slate-500">Waste/BP:</span> <strong>{fmtNum(wastes.reduce((s, w) => s + (w.weight || 0), 0))} kg</strong></div>
            </div>
          )}
          {selectedEvt && (() => {
            const cutsWt = cuts.reduce((s, c) => s + (c.weight || 0), 0);
            const wasteWt = wastes.reduce((s, w) => s + (w.weight || 0), 0);
            const totalWt = cutsWt + wasteWt;
            const carcassWt = selectedEvt.cold_carcass_weight || 0;
            if (carcassWt > 0 && totalWt > carcassWt) {
              return (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Weight Exceeded:</strong> The sum of cuts ({fmtNum(cutsWt)} kg) and waste ({fmtNum(wasteWt)} kg) totals {fmtNum(totalWt)} kg, which exceeds the cold carcass weight of {fmtNum(carcassWt)} kg (over by {fmtNum(totalWt - carcassWt)} kg).
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Action Bar */}
          <div className="flex gap-2 items-center">
            <CutForm eventId={selectedEvent} animalTag={selectedEvt?.animal_tag} species={selectedSpecies} carcassWt={selectedEvt?.cold_carcass_weight} usedCutNames={cuts.map((c) => c.cut_name)} onSaved={() => queryClient.invalidateQueries({ queryKey: ["primalCuts"] })} />
            <WasteForm eventId={selectedEvent} usedCategories={wastes.map((w) => w.category)} onSaved={() => queryClient.invalidateQueries({ queryKey: ["wasteByProducts"] })} />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="ml-auto w-[140px] h-8 text-sm">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="cuts">Cuts</SelectItem>
                <SelectItem value="waste">Waste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primal Cuts */}
          {showCuts && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Primal Cuts ({filteredCuts.length})</h3>
            {cutsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : filteredCuts.length === 0 ? (
              <p className="text-xs text-slate-400">No cuts recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {filteredCuts.map((c) => (
                  <Card key={c.id} className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-sm font-medium text-slate-900">{c.cut_name}</span>
                        {c.is_condemned && <Badge className="ml-2 bg-red-100 text-red-700">Condemned</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{fmtNum(c.weight)} kg</span>
                      <span>Yield: {pct(c.yield_percentage)}</span>
                      <Badge variant="outline" className="capitalize">{c.quality_grade}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCut(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600 h-7 w-7" onClick={() => { if (confirm("Delete cut?")) { base44.entities.PrimalCut.delete(c.id); queryClient.invalidateQueries({ queryKey: ["primalCuts"] }); } }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Waste / By-Product */}
          {showWastes && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Waste & By-Products ({filteredWastes.length})</h3>
            {filteredWastes.length === 0 ? (
              <p className="text-xs text-slate-400">No waste/by-products recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {filteredWastes.map((w) => (
                  <Card key={w.id} className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={w.type === "by_product" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                        {w.type === "by_product" ? "By-Product" : "Disposal"}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">{w.name || w.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{fmtNum(w.weight)} kg</span>
                      {w.type === "by_product" && <span className="text-green-600">Rev: {fmtNum(w.recovery_value)}</span>}
                      {w.is_estimated && <Badge className="bg-amber-100 text-amber-700">Est.</Badge>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingWaste(w)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600 h-7 w-7" onClick={() => { if (confirm("Delete?")) { base44.entities.WasteByProduct.delete(w.id); queryClient.invalidateQueries({ queryKey: ["wasteByProducts"] }); } }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          )}
        </>
      )}
      {editingCut && (
        <CutEditDialog cut={editingCut} species={selectedSpecies} carcassWt={selectedEvt?.cold_carcass_weight} onClose={() => setEditingCut(null)} onSaved={() => { setEditingCut(null); queryClient.invalidateQueries({ queryKey: ["primalCuts"] }); }} />
      )}
      {editingWaste && (
        <WasteEditDialog waste={editingWaste} onClose={() => setEditingWaste(null)} onSaved={() => { setEditingWaste(null); queryClient.invalidateQueries({ queryKey: ["wasteByProducts"] }); }} />
      )}
    </div>
  );
}

function CutEditDialog({ cut, species, carcassWt, onClose, onSaved }) {
  const [form, setForm] = useState({
    cut_name: cut.cut_name || "",
    weight: cut.weight ?? "",
    quality_grade: cut.quality_grade || "standard",
    market_price_per_unit: cut.market_price_per_unit ?? "",
    is_condemned: cut.is_condemned || false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.cut_name) return toast.error("Cut name required");
    if (!form.weight) return toast.error("Weight required");
    setSaving(true);
    try {
      const weight = Number(form.weight);
      await base44.entities.PrimalCut.update(cut.id, {
        cut_name: form.cut_name, weight, weight_unit: "kg",
        yield_percentage: carcassWt ? (weight / carcassWt) * 100 : 0,
        quality_grade: form.quality_grade,
        market_price_per_unit: Number(form.market_price_per_unit) || 0,
        is_condemned: form.is_condemned,
      });
      toast.success("Cut updated");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Primal Cut</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Cut Name *</Label>
            <Select value={form.cut_name} onValueChange={(v) => set("cut_name", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {getCutsForSpecies(species).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Weight (kg) *</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => set("weight", e.target.value)} /></div>
          <div><Label>Quality Grade</Label>
            <Select value={form.quality_grade} onValueChange={(v) => set("quality_grade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Market Price/Unit (value-based)</Label><Input type="number" step="0.01" value={form.market_price_per_unit} onChange={(e) => set("market_price_per_unit", e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_condemned} onChange={(e) => set("is_condemned", e.target.checked)} />
            Condemned (partial condemnation)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WasteEditDialog({ waste, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: waste.type || "disposal",
    category: waste.category || "bone",
    name: waste.name || "",
    weight: waste.weight ?? "",
    disposal_cost: waste.disposal_cost ?? "",
    hauler_method: waste.hauler_method || "",
    recovery_value: waste.recovery_value ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.weight) return toast.error("Weight required");
    setSaving(true);
    try {
      await base44.entities.WasteByProduct.update(waste.id, {
        type: form.type, category: form.category,
        name: form.name || form.category, weight: Number(form.weight), weight_unit: "kg",
        disposal_cost: Number(form.disposal_cost) || 0, hauler_method: form.hauler_method,
        recovery_value: form.type === "by_product" ? (Number(form.recovery_value) || 0) : 0,
      });
      toast.success("Waste/by-product updated");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Waste / By-Product</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="disposal">Disposal (cost only)</SelectItem>
                <SelectItem value="by_product">By-Product (has recovery value)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WASTE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Weight (kg) *</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => set("weight", e.target.value)} /></div>
          {form.type === "disposal" ? (
            <>
              <div><Label>Disposal Cost</Label><Input type="number" step="0.01" value={form.disposal_cost} onChange={(e) => set("disposal_cost", e.target.value)} /></div>
              <div><Label>Hauler / Method</Label><Input value={form.hauler_method} onChange={(e) => set("hauler_method", e.target.value)} /></div>
            </>
          ) : (
            <div><Label>Recovery Value (estimated)</Label><Input type="number" step="0.01" value={form.recovery_value} onChange={(e) => set("recovery_value", e.target.value)} /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CutForm({ eventId, animalTag, species, carcassWt, usedCutNames = [], onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cut_name: "", weight: "", quality_grade: "standard", market_price_per_unit: "", is_condemned: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.cut_name) return toast.error("Cut name required");
    if (!form.weight) return toast.error("Weight required");
    setSaving(true);
    try {
      const weight = Number(form.weight);
      await base44.entities.PrimalCut.create({
        slaughter_event_id: eventId, animal_tag: animalTag || "",
        cut_name: form.cut_name, weight, weight_unit: "kg",
        yield_percentage: carcassWt ? (weight / carcassWt) * 100 : 0,
        quality_grade: form.quality_grade,
        market_price_per_unit: Number(form.market_price_per_unit) || 0,
        is_condemned: form.is_condemned,
      });
      toast.success("Cut added");
      setForm({ cut_name: "", weight: "", quality_grade: "standard", market_price_per_unit: "", is_condemned: false });
      onSaved();
      setOpen(false);
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1 bg-red-600 hover:bg-red-700"><Plus className="w-3 h-3" /> Add Cut</Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Primal Cut</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cut Name *</Label>
              <Select value={form.cut_name} onValueChange={(v) => set("cut_name", v)}>
                <SelectTrigger><SelectValue placeholder={`Choose a ${species} cut...`} /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {getCutsForSpecies(species).map((c) => {
                    const used = usedCutNames.includes(c);
                    return (
                      <SelectItem key={c} value={c} disabled={used} className={used ? "opacity-40" : ""}>
                        {c}{used ? " (added)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Weight (kg) *</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => set("weight", e.target.value)} /></div>
            <div><Label>Quality Grade</Label>
              <Select value={form.quality_grade} onValueChange={(v) => set("quality_grade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Market Price/Unit (value-based)</Label><Input type="number" step="0.01" value={form.market_price_per_unit} onChange={(e) => set("market_price_per_unit", e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_condemned} onChange={(e) => set("is_condemned", e.target.checked)} />
              Condemned (partial condemnation)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WasteForm({ eventId, usedCategories = [], onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "disposal", category: "bone", name: "", weight: "", disposal_cost: "", hauler_method: "", recovery_value: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.weight) return toast.error("Weight required");
    setSaving(true);
    try {
      await base44.entities.WasteByProduct.create({
        slaughter_event_id: eventId, type: form.type, category: form.category,
        name: form.name || form.category, weight: Number(form.weight), weight_unit: "kg",
        disposal_cost: Number(form.disposal_cost) || 0, hauler_method: form.hauler_method,
        recovery_value: form.type === "by_product" ? (Number(form.recovery_value) || 0) : 0,
        recovery_value_source: "manual",
      });
      toast.success("Waste/by-product added");
      setForm({ type: "disposal", category: "bone", name: "", weight: "", disposal_cost: "", hauler_method: "", recovery_value: "" });
      onSaved();
      setOpen(false);
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1 bg-red-600 hover:bg-red-700"><Plus className="w-3 h-3" /> Add Waste</Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Waste / By-Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disposal">Disposal (cost only)</SelectItem>
                  <SelectItem value="by_product">By-Product (has recovery value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WASTE_CATEGORIES.map((c) => {
                    const used = usedCategories.includes(c) && c !== "other";
                    return (
                      <SelectItem key={c} value={c} className="capitalize" disabled={used ? true : undefined}>
                        <span className={used ? "opacity-40" : ""}>{c.replace("_", " ")}{used ? " (added)" : ""}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Optional name" /></div>
            <div><Label>Weight (kg) *</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => set("weight", e.target.value)} /></div>
            {form.type === "disposal" ? (
              <>
                <div><Label>Disposal Cost</Label><Input type="number" step="0.01" value={form.disposal_cost} onChange={(e) => set("disposal_cost", e.target.value)} /></div>
                <div><Label>Hauler / Method</Label><Input value={form.hauler_method} onChange={(e) => set("hauler_method", e.target.value)} /></div>
              </>
            ) : (
              <div><Label>Recovery Value (estimated)</Label><Input type="number" step="0.01" value={form.recovery_value} onChange={(e) => set("recovery_value", e.target.value)} placeholder="Leave blank for auto-fallback" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}