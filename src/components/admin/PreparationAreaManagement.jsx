import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, GripVertical, ChefHat } from "lucide-react";
import { toast } from "sonner";

const ICON_OPTIONS = [
  "ChefHat", "Wine", "Flame", "Coffee", "UtensilsCrossed", "Soup", "Pizza",
  "IceCream", "CupSoda", "Beef", "Fish", "Sandwich", "Cake", "Apple",
  "Wheat", "Egg", "GlassWater", "Martini", "Cookie", "Croissant"
];

const COLOR_OPTIONS = [
  { value: "#f59e0b", label: "Amber" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ef4444", label: "Red" },
  { value: "#10b981", label: "Green" },
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#f97316", label: "Orange" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#6b7280", label: "Gray" }
];

export default function PreparationAreaManagement() {
  const queryClient = useQueryClient();
  const [editingArea, setEditingArea] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ["preparationAreas"],
    queryFn: () => base44.entities.PreparationArea.list("sort_order")
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.entities.Printer.list()
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PreparationArea.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preparationAreas"] });
      toast.success("Preparation area created");
      setShowForm(false);
      setEditingArea(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PreparationArea.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preparationAreas"] });
      toast.success("Preparation area updated");
      setShowForm(false);
      setEditingArea(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PreparationArea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preparationAreas"] });
      toast.success("Preparation area deleted");
    }
  });

  const handleSave = (formData) => {
    const data = {
      ...formData,
      key: formData.key.toLowerCase().replace(/\s+/g, "_"),
      sort_order: Number(formData.sort_order) || 0,
      font_size: Number(formData.font_size) || 14
    };
    if (editingArea?.id) {
      updateMutation.mutate({ id: editingArea.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setShowForm(true);
  };

  const handleDelete = (area) => {
    const itemCount = menuItems.filter(m => m.preparation_station === area.key).length;
    if (itemCount > 0) {
      toast.error(`Cannot delete: ${itemCount} menu item(s) are assigned to this area. Reassign them first.`);
      return;
    }
    if (confirm(`Delete "${area.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(area.id);
    }
  };

  const handleToggleActive = (area) => {
    updateMutation.mutate({ id: area.id, data: { is_active: !area.is_active } });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading preparation areas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Preparation Areas
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Define preparation stations (Kitchen, Bar, Grill, etc.). Menu items are assigned to these areas.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => { setEditingArea(null); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Area
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <AreaForm
            area={editingArea}
            printers={printers}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingArea(null); }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {areas.length === 0 && !showForm ? (
          <div className="text-center py-8 text-slate-400">
            <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>No preparation areas defined yet. Click "Add Area" to create your first one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {areas.map((area, idx) => {
              const itemCount = menuItems.filter(m => m.preparation_station === area.key).length;
              return (
                <div
                  key={area.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                    style={{ backgroundColor: area.color || "#f59e0b" }}
                  >
                    <span className="text-lg font-bold">{area.name?.charAt(0) || "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{area.name}</p>
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{area.key}</code>
                    </div>
                    <p className="text-xs text-slate-500">
                      {itemCount} menu item(s) · Sort: {area.sort_order ?? idx}
                    </p>
                  </div>
                  <Switch
                    checked={area.is_active !== false}
                    onCheckedChange={() => handleToggleActive(area)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(area)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(area)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AreaForm({ area, printers, onSave, onCancel, isPending }) {
  const [formData, setFormData] = useState({
    name: area?.name || "",
    key: area?.key || "",
    icon_name: area?.icon_name || "ChefHat",
    color: area?.color || "#f59e0b",
    is_active: area?.is_active !== false,
    sort_order: area?.sort_order ?? 0,
    printer_id: area?.printer_id || "",
    header_text: area?.header_text || "",
    footer_text: area?.footer_text || "",
    font_size: area?.font_size || 14
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.key.trim()) {
      toast.error("Name and key are required");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/50 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Display Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Kitchen, Bar, Grill"
          />
        </div>
        <div>
          <Label>Key (slug) *</Label>
          <Input
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder="e.g., kitchen, bar, grill"
            disabled={!!area}
          />
          {area && <p className="text-xs text-slate-400 mt-1">Key cannot be changed after creation</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Icon</Label>
          <Select value={formData.icon_name} onValueChange={(v) => setFormData({ ...formData, icon_name: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map(icon => (
                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Color</Label>
          <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Default Printer</Label>
          <Select value={formData.printer_id} onValueChange={(v) => setFormData({ ...formData, printer_id: v })}>
            <SelectTrigger><SelectValue placeholder="No default printer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {printers.filter(p => p.is_enabled).map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.printer_ip && `(${p.printer_ip})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Header Text (printed)</Label>
          <Textarea
            value={formData.header_text}
            onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
            placeholder="e.g., 🍳 KITCHEN ORDER"
            rows={2}
          />
        </div>
        <div>
          <Label>Footer Text (printed)</Label>
          <Textarea
            value={formData.footer_text}
            onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
            placeholder="e.g., Prepare immediately"
            rows={2}
          />
        </div>
      </div>

      <div className="w-32">
        <Label>Font Size (px)</Label>
        <Select value={String(formData.font_size)} onValueChange={(v) => setFormData({ ...formData, font_size: parseInt(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[12, 14, 16, 18, 20].map(s => (
              <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
        <div>
          <Label>Active</Label>
          <p className="text-xs text-slate-500">Inactive areas are hidden from menus and KDS</p>
        </div>
        <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600">
          {isPending ? "Saving..." : area ? "Update Area" : "Create Area"}
        </Button>
      </div>
    </form>
  );
}