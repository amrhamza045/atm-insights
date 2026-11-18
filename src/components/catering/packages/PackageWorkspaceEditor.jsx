import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import CateringOptionSelect from "../CateringOptionSelect";
import PackageLineEditor from "../PackageLineEditor";
import PackageEquipmentRequirementsEditor from "../PackageEquipmentRequirementsEditor";
import PackageMaterialRequirementsEditor from "../PackageMaterialRequirementsEditor";
import PackageEconomicsBar from "../PackageEconomicsBar";
import PackageExtraItemsEditor from "../PackageExtraItemsEditor";
import PackageMediaManager from "./PackageMediaManager";
import { packageEconomics } from "../packageLogic";

const EMPTY_PACKAGE = {
  name: "",
  description: "",
  package_category: "",
  pricing_mode: "itemized",
  base_price_per_guest: 0,
  flat_price: 0,
  min_guests: 0,
  target_margin_percentage: "",
  is_active: true,
  cover_image_url: "",
  cover_video_url: "",
  media_gallery: [],
  line_items: [],
  extra_items: [],
  equipment_requirements: [],
  material_requirements: [],
  notes: "",
};

export default function PackageWorkspaceEditor({ pkg, defaultCategory = "", onCancel, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_PACKAGE);
  const [previewGuests, setPreviewGuests] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pkg) {
      setForm({
        ...EMPTY_PACKAGE,
        ...pkg,
        target_margin_percentage:
          pkg.target_margin_percentage == null ? "" : pkg.target_margin_percentage,
      });
    } else {
      setForm({
        ...EMPTY_PACKAGE,
        package_category:
          defaultCategory && defaultCategory !== "__all__" && defaultCategory !== "Uncategorized"
            ? defaultCategory
            : "",
      });
    }
  }, [pkg, defaultCategory]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const economics = useMemo(() => packageEconomics(form, previewGuests), [form, previewGuests]);

  const handleSave = async () => {
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
        target_margin_percentage:
          form.target_margin_percentage === "" || form.target_margin_percentage == null
            ? null
            : Number(form.target_margin_percentage),
        is_active: form.is_active !== false,
        cover_image_url: form.cover_image_url?.trim() || "",
        cover_video_url: form.cover_video_url?.trim() || "",
        media_gallery: (form.media_gallery || [])
          .filter((m) => m?.url?.trim())
          .map((m) => ({
            type: m.type === "video" ? "video" : "image",
            url: m.url.trim(),
            caption: m.caption || "",
          })),
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

      let saved;
      if (pkg?.id) {
        saved = await base44.entities.CateringPackage.update(pkg.id, payload);
      } else {
        saved = await base44.entities.CateringPackage.create(payload);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-packages"] }),
        queryClient.invalidateQueries({ queryKey: ["cateringPackages", "public"] }),
      ]);
      toast.success(pkg?.id ? "Package updated" : "Package created");
      onSaved?.(saved);
    } catch (e) {
      toast.error(e.message || "Could not save the package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 border-[#d9d3c6] bg-[#fffefa] space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e8e1d3]">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to Packages
          </Button>
          <div>
            <h2 className="text-lg font-bold text-[#18314b]">
              {pkg?.id ? `Edit Package: ${pkg.name}` : "Create New Catering Package"}
            </h2>
            <p className="text-xs text-slate-500">
              Configure package pricing, landing page photos & videos, menu items, and operational requirements.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg border bg-white">
            <Label className="text-xs text-slate-600 cursor-pointer">Active on Website & Quotes</Label>
            <Switch
              checked={form.is_active !== false}
              onCheckedChange={(checked) => set("is_active", checked)}
            />
          </div>
          <Button type="button" variant="outline" onClick={onCancel} className="gap-1.5">
            <X className="w-4 h-4" /> Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : pkg?.id ? "Save Changes" : "Create Package"}
          </Button>
        </div>
      </div>

      {/* Section 1: Basic Details & Pricing */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Package name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Gold Wedding Buffet"
              className="bg-white"
            />
          </div>
          <div>
            <Label>Category</Label>
            <CateringOptionSelect
              listType="package_category"
              value={form.package_category}
              onChange={(v) => set("package_category", v)}
              placeholder="Select category"
            />
          </div>
        </div>

        <div>
          <Label>Public description (shown on the landing page & quotes)</Label>
          <Textarea
            value={form.description || ""}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Describe the occasion, culinary highlights, and service style…"
            className="bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label>Pricing mode</Label>
            <Select value={form.pricing_mode} onValueChange={(v) => set("pricing_mode", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="itemized">Itemized (price from items)</SelectItem>
                <SelectItem value="per_guest">Headline price per guest</SelectItem>
                <SelectItem value="flat">Flat package price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.pricing_mode === "per_guest" && (
            <div>
              <Label>Price per guest</Label>
              <Input
                type="number"
                min="0"
                value={form.base_price_per_guest}
                onChange={(e) => set("base_price_per_guest", e.target.value)}
                className="bg-white"
              />
            </div>
          )}
          {form.pricing_mode === "flat" && (
            <div>
              <Label>Flat price</Label>
              <Input
                type="number"
                min="0"
                value={form.flat_price}
                onChange={(e) => set("flat_price", e.target.value)}
                className="bg-white"
              />
            </div>
          )}
          <div>
            <Label>Minimum guests</Label>
            <Input
              type="number"
              min="0"
              value={form.min_guests}
              onChange={(e) => set("min_guests", e.target.value)}
              className="bg-white"
            />
          </div>
          <div>
            <Label>Target margin override (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.target_margin_percentage ?? ""}
              onChange={(e) => set("target_margin_percentage", e.target.value)}
              placeholder="Use event/global target"
              className="bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Landing Page Media Manager */}
      <PackageMediaManager form={form} onChange={set} />

      {/* Section 3: Package Menu Items & Optional Extras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Label className="mb-2 block text-sm font-semibold text-slate-900">
            Included Package Items *
          </Label>
          <PackageLineEditor
            lines={form.line_items || []}
            onChange={(v) => set("line_items", v)}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Label className="mb-2 block text-sm font-semibold text-slate-900">
            Extra Items Visitors Can Add (Optional)
          </Label>
          <PackageExtraItemsEditor
            rows={form.extra_items || []}
            onChange={(v) => set("extra_items", v)}
          />
        </div>
      </div>

      {/* Section 4: Equipment & Material Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Label className="mb-2 block text-sm font-semibold text-slate-900">
            Equipment Requirements (Optional)
          </Label>
          <PackageEquipmentRequirementsEditor
            rows={form.equipment_requirements || []}
            onChange={(v) => set("equipment_requirements", v)}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Label className="mb-2 block text-sm font-semibold text-slate-900">
            Material Requirements (Optional)
          </Label>
          <PackageMaterialRequirementsEditor
            rows={form.material_requirements || []}
            onChange={(v) => set("material_requirements", v)}
          />
        </div>
      </div>

      {/* Economics Preview Bar */}
      <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-[#e8e1d3]">
        <div className="w-44">
          <Label>Preview economics at guests</Label>
          <Input
            type="number"
            min="1"
            value={previewGuests}
            onChange={(e) => setPreviewGuests(e.target.value)}
            className="bg-white"
          />
        </div>
        <div className="flex-1 min-w-[280px]">
          <PackageEconomicsBar
            economics={economics}
            guests={Number(previewGuests) || 0}
            label="Package economics"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : pkg?.id ? "Save Changes" : "Create Package"}
        </Button>
      </div>
    </Card>
  );
}