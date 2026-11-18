import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import CateringOptionSelect from "./CateringOptionSelect";
import PackageLineEditor from "./PackageLineEditor";
import PackageEquipmentRequirementsEditor from "./PackageEquipmentRequirementsEditor";
import PackageMaterialRequirementsEditor from "./PackageMaterialRequirementsEditor";
import PackageEconomicsBar from "./PackageEconomicsBar";
import PackageExtraItemsEditor from "./PackageExtraItemsEditor";
import { packageEconomics } from "./packageLogic";

const empty = {
  name: "", description: "", package_category: "", pricing_mode: "itemized",
  base_price_per_guest: 0, flat_price: 0, min_guests: 0, target_margin_percentage: "", is_active: true, line_items: [],
  equipment_requirements: [],
  material_requirements: [],
};

export default function PackageFormDialog({ open, onOpenChange, pkg }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [previewGuests, setPreviewGuests] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(pkg ? { ...empty, ...pkg } : empty);
  }, [open, pkg]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const economics = useMemo(() => packageEconomics(form, previewGuests), [form, previewGuests]);

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Package name is required");
    if (!(form.line_items || []).length) return toast.error("Add at least one package item");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || "",
        package_category: form.package_category || "",
        pricing_mode: form.pricing_mode || "itemized",
        base_price_per_guest: Number(form.base_price_per_guest) || 0,
        flat_price: Number(form.flat_price) || 0,
        min_guests: Number(form.min_guests) || 0,
        target_margin_percentage: form.target_margin_percentage === "" || form.target_margin_percentage == null ? null : Number(form.target_margin_percentage),
        is_active: form.is_active !== false,
        line_items: (form.line_items || [])
          .filter((l) => l.name?.trim())
          .map((l) => ({
            ...l,
            quantity: Number(l.quantity) || 0,
            unit_price: Number(l.unit_price) || 0,
            unit_cost: Number(l.unit_cost) || 0,
          })),
        extra_items: (form.extra_items || [])
          .filter((x) => x.name?.trim())
          .map((x) => ({
            name: x.name.trim(),
            description: x.description || "",
            price: Number(x.price) || 0,
            scaling: x.scaling === "per_guest" ? "per_guest" : "fixed",
          })),
        equipment_requirements: (form.equipment_requirements || [])
          .filter((r) => r.equipment_id)
          .map((r) => ({
            equipment_id: r.equipment_id,
            equipment_name: r.equipment_name || "",
            scaling_mode: r.scaling_mode === "per_guest" ? "per_guest" : "flat",
            quantity: Number(r.quantity) || 0,
            per_guest_divisor: Number(r.per_guest_divisor) || 1,
            notes: r.notes || "",
          })),
        material_requirements: (form.material_requirements || [])
          .filter((r) => r.inventory_item_id)
          .map((r) => ({
            inventory_item_id: r.inventory_item_id,
            inventory_item_name: r.inventory_item_name || "",
            scaling_mode: r.scaling_mode === "per_guest" ? "per_guest" : "flat",
            quantity: Number(r.quantity) || 0,
            per_guest_divisor: Number(r.per_guest_divisor) || 1,
            notes: r.notes || "",
          })),
        notes: form.notes || "",
      };
      if (pkg?.id) await base44.entities.CateringPackage.update(pkg.id, payload);
      else await base44.entities.CateringPackage.create(payload);
      await queryClient.invalidateQueries({ queryKey: ["catering-packages"] });
      toast.success(pkg?.id ? "Package updated" : "Package created");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pkg?.id ? "Edit Package" : "New Package"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Package name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Gold Wedding Buffet" /></div>
            <div>
              <Label>Category</Label>
              <CateringOptionSelect listType="package_category" value={form.package_category} onChange={(v) => set("package_category", v)} placeholder="Select category" />
            </div>
          </div>

          <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} /></div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Pricing mode</Label>
              <Select value={form.pricing_mode} onValueChange={(v) => set("pricing_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="itemized">Itemized (price from items)</SelectItem>
                  <SelectItem value="per_guest">Headline price per guest</SelectItem>
                  <SelectItem value="flat">Flat package price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.pricing_mode === "per_guest" && (
              <div><Label>Price per guest</Label><Input type="number" min="0" value={form.base_price_per_guest} onChange={(e) => set("base_price_per_guest", e.target.value)} /></div>
            )}
            {form.pricing_mode === "flat" && (
              <div><Label>Flat price</Label><Input type="number" min="0" value={form.flat_price} onChange={(e) => set("flat_price", e.target.value)} /></div>
            )}
            <div><Label>Minimum guests</Label><Input type="number" min="0" value={form.min_guests} onChange={(e) => set("min_guests", e.target.value)} /></div>
            <div><Label>Target margin override (%)</Label><Input type="number" min="0" max="100" step="0.1" value={form.target_margin_percentage ?? ""} onChange={(e) => set("target_margin_percentage", e.target.value)} placeholder="Use event/global target" /></div>
          </div>

          <div>
            <Label className="mb-1.5 block">Package items</Label>
            <PackageLineEditor lines={form.line_items || []} onChange={(v) => set("line_items", v)} />
          </div>

          <div>
            <Label className="mb-1.5 block">Extra items visitors can add (optional)</Label>
            <PackageExtraItemsEditor rows={form.extra_items || []} onChange={(v) => set("extra_items", v)} />
          </div>

          <div>
            <Label className="mb-1.5 block">Equipment requirements (optional)</Label>
            <PackageEquipmentRequirementsEditor
              rows={form.equipment_requirements || []}
              onChange={(v) => set("equipment_requirements", v)}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Material requirements (optional)</Label>
            <PackageMaterialRequirementsEditor
              rows={form.material_requirements || []}
              onChange={(v) => set("material_requirements", v)}
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="w-40"><Label>Preview at guests</Label><Input type="number" min="1" value={previewGuests} onChange={(e) => setPreviewGuests(e.target.value)} /></div>
            <div className="flex-1"><PackageEconomicsBar economics={economics} guests={Number(previewGuests) || 0} label="Package economics" /></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{pkg?.id ? "Save changes" : "Create package"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}