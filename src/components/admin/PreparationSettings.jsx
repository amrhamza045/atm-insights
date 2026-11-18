import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChefHat, Wine, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function PreparationSettings() {
  const queryClient = useQueryClient();

  const { data: complianceSettings } = useQuery({
    queryKey: ["complianceSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "compliance_settings" });
      return result[0] || null;
    }
  });

  const updateComplianceMutation = useMutation({
    mutationFn: async (mode) => {
      if (complianceSettings?.id) {
        return await base44.entities.SystemSettings.update(complianceSettings.id, { enforcement_mode: mode });
      } else {
        return await base44.entities.SystemSettings.create({ setting_key: "compliance_settings", enforcement_mode: mode });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complianceSettings"] });
      toast.success("Compliance enforcement mode updated");
    }
  });

  const { data: preparationSettings, isLoading } = useQuery({
    queryKey: ["preparationSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "preparation_settings" });
      return result[0] || {
        setting_key: "preparation_settings",
        default_kitchen_printer_id: "",
        default_bar_printer_id: "",
        kitchen_header: "🍳 KITCHEN ORDER",
        bar_header: "🍹 BAR ORDER",
        kitchen_footer: "Prepare immediately",
        bar_footer: "Prepare immediately",
        show_prep_time: true,
        show_table_number: true,
        show_customer_name: true,
        show_order_notes: true,
        kitchen_font_size: 14,
        bar_font_size: 14
      };
    }
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.entities.Printer.list()
  });

  const [formData, setFormData] = useState(null);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (preparationSettings?.id) {
        return await base44.entities.SystemSettings.update(preparationSettings.id, data);
      } else {
        return await base44.entities.SystemSettings.create({ ...data, setting_key: "preparation_settings" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preparationSettings"] });
      toast.success("Preparation settings saved");
    }
  });

  // Initialize form data when settings load
  if (!formData && preparationSettings) {
    setFormData({
      default_kitchen_printer_id: preparationSettings.default_kitchen_printer_id || "",
      default_bar_printer_id: preparationSettings.default_bar_printer_id || "",
      kitchen_header: preparationSettings.kitchen_header || "🍳 KITCHEN ORDER",
      bar_header: preparationSettings.bar_header || "🍹 BAR ORDER",
      kitchen_footer: preparationSettings.kitchen_footer || "Prepare immediately",
      bar_footer: preparationSettings.bar_footer || "Prepare immediately",
      show_prep_time: preparationSettings.show_prep_time !== false,
      show_table_number: preparationSettings.show_table_number !== false,
      show_customer_name: preparationSettings.show_customer_name !== false,
      show_order_notes: preparationSettings.show_order_notes !== false,
      kitchen_font_size: preparationSettings.kitchen_font_size || 14,
      bar_font_size: preparationSettings.bar_font_size || 14
    });
  }

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading || !formData) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const kitchenPrinters = printers.filter(p => p.type === "kitchen");
  const barPrinters = printers.filter(p => p.type === "bar");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Preparation Order Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure how preparation orders are printed to kitchen and bar
        </p>
      </div>

      {/* Delivery Compliance Enforcement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Delivery Receipt Compliance Enforcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-3">
              {complianceSettings?.enforcement_mode === "enforced" ? (
                <ShieldAlert className="w-5 h-5 text-red-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-medium text-slate-900">Enforcement Mode</p>
                <p className="text-sm text-slate-500">
                  {complianceSettings?.enforcement_mode === "enforced"
                    ? "Enforced — checkout is blocked when receipt payment doesn't match POS payment method"
                    : "Reporting only — compliance issues are logged but checkout is allowed"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const newMode = complianceSettings?.enforcement_mode === "enforced" ? "reporting" : "enforced";
                updateComplianceMutation.mutate(newMode);
              }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                complianceSettings?.enforcement_mode === "enforced" ? "bg-red-600" : 'bg-amber-500'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  complianceSettings?.enforcement_mode === "enforced" ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={complianceSettings?.enforcement_mode !== "enforced" ? "default" : "outline"}
              size="sm"
              onClick={() => updateComplianceMutation.mutate("reporting")}
              className={complianceSettings?.enforcement_mode !== "enforced" ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              📊 Reporting Only
            </Button>
            <Button
              variant={complianceSettings?.enforcement_mode === "enforced" ? "default" : "outline"}
              size="sm"
              onClick={() => updateComplianceMutation.mutate("enforced")}
              className={complianceSettings?.enforcement_mode === "enforced" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              🚫 Enforce (Block Checkout)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Printers */}
      <Card>
        <CardHeader>
          <CardTitle>Default Printers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <ChefHat className="w-4 h-4" />
              Default Kitchen Printer
            </Label>
            <Select 
              value={formData.default_kitchen_printer_id} 
              onValueChange={(value) => setFormData({...formData, default_kitchen_printer_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select kitchen printer" />
              </SelectTrigger>
              <SelectContent>
                {kitchenPrinters.length === 0 ? (
                  <SelectItem value={null} disabled>No kitchen printers configured</SelectItem>
                ) : (
                  kitchenPrinters.map(printer => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name} {printer.printer_ip && `(${printer.printer_ip})`} {!printer.is_enabled && "(Disabled)"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Wine className="w-4 h-4" />
              Default Bar Printer
            </Label>
            <Select 
              value={formData.default_bar_printer_id} 
              onValueChange={(value) => setFormData({...formData, default_bar_printer_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bar printer" />
              </SelectTrigger>
              <SelectContent>
                {barPrinters.length === 0 ? (
                  <SelectItem value={null} disabled>No bar printers configured</SelectItem>
                ) : (
                  barPrinters.map(printer => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name} {printer.printer_ip && `(${printer.printer_ip})`} {!printer.is_enabled && "(Disabled)"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kitchen Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Kitchen Preparation Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Header Text</Label>
            <Textarea
              value={formData.kitchen_header}
              onChange={(e) => setFormData({...formData, kitchen_header: e.target.value})}
              placeholder="🍳 KITCHEN ORDER"
              rows={2}
            />
          </div>

          <div>
            <Label>Footer Text</Label>
            <Textarea
              value={formData.kitchen_footer}
              onChange={(e) => setFormData({...formData, kitchen_footer: e.target.value})}
              placeholder="Prepare immediately"
              rows={2}
            />
          </div>

          <div>
            <Label>Font Size (px)</Label>
            <Select 
              value={String(formData.kitchen_font_size)} 
              onValueChange={(value) => setFormData({...formData, kitchen_font_size: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="14">14px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
                <SelectItem value="18">18px</SelectItem>
                <SelectItem value="20">20px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bar Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wine className="w-5 h-5" />
            Bar Preparation Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Header Text</Label>
            <Textarea
              value={formData.bar_header}
              onChange={(e) => setFormData({...formData, bar_header: e.target.value})}
              placeholder="🍹 BAR ORDER"
              rows={2}
            />
          </div>

          <div>
            <Label>Footer Text</Label>
            <Textarea
              value={formData.bar_footer}
              onChange={(e) => setFormData({...formData, bar_footer: e.target.value})}
              placeholder="Prepare immediately"
              rows={2}
            />
          </div>

          <div>
            <Label>Font Size (px)</Label>
            <Select 
              value={String(formData.bar_font_size)} 
              onValueChange={(value) => setFormData({...formData, bar_font_size: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="14">14px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
                <SelectItem value="18">18px</SelectItem>
                <SelectItem value="20">20px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle>Display Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Show Preparation Time</Label>
              <Switch
                checked={formData.show_prep_time}
                onCheckedChange={(checked) => setFormData({...formData, show_prep_time: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Table Number</Label>
              <Switch
                checked={formData.show_table_number}
                onCheckedChange={(checked) => setFormData({...formData, show_table_number: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Customer Name</Label>
              <Switch
                checked={formData.show_customer_name}
                onCheckedChange={(checked) => setFormData({...formData, show_customer_name: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Order Notes</Label>
              <Switch
                checked={formData.show_order_notes}
                onCheckedChange={(checked) => setFormData({...formData, show_order_notes: checked})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSave}
        disabled={updateSettingsMutation.isPending}
      >
        {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}