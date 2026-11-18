import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Plus, ArrowLeft, Trash2, TestTube } from "lucide-react";
import { toast } from "sonner";
import { printReceipt } from "@/components/pos/ReceiptPrinter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PrinterSettings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "cashier",
    is_enabled: true,
    auto_print_on_order: false,
    receipt_width: 80,
    font_size: 12,
    font_name: "Consolas",
    print_kitchen_items: false,
    print_bar_items: false,
    restaurant_logo_url: "",
    receipt_header: brandName(),
    receipt_footer: "Thank you for your visit!",
    restaurant_address: "",
    restaurant_phone: "",
    restaurant_whatsapp: "",
    restaurant_hotline: "",
    restaurant_website: "",
    commercial_registration: "",
    tax_card: "",
    show_logo: true,
    show_address: true,
    show_phone: true,
    show_whatsapp: true,
    show_hotline: true,
    show_website: true,
    show_order_number: true,
    show_date_time: true,
    show_cashier: true,
    show_table_number: true,
    show_customer_name: true,
    show_payment_method: true,
    show_tax_breakdown: true,
    show_service_breakdown: true
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.asServiceRole.entities.Printer.list("-created_date")
  });

  const { data: restaurantSettings } = useQuery({
    queryKey: ["restaurantSettings"],
    queryFn: async () => {
      const result = await base44.asServiceRole.entities.SystemSettings.filter({ setting_key: "printer_settings" });
      return result[0] || {
        setting_key: "printer_settings",
        restaurant_logo_url: "",
        receipt_header: brandName(),
        receipt_footer: "Thank you for your visit!",
        restaurant_address: "",
        restaurant_phone: "",
        restaurant_whatsapp: "",
        restaurant_website: ""
      };
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const handleTestPrint = async (printer) => {
    const testOrder = {
      id: "test-" + Date.now(),
      customer_name: "Test Customer",
      order_type: "dine_in",
      table_number: "1",
      items: [
        { name: "Test Item 1", quantity: 2, price: 10.00 },
        { name: "Test Item 2", quantity: 1, price: 15.00 }
      ],
      subtotal: 35.00,
      tax: 3.50,
      service_charge: 3.50,
      total: 42.00,
      payment_method: "cash",
      created_date: new Date().toISOString()
    };
    
    await printReceipt(testOrder, printer, currentUser?.full_name || currentUser?.email, printer.type);
    toast.success("Test receipt sent to printer");
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, restaurant_logo_url: result.file_url });
      toast.success("Logo uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const createPrinterMutation = useMutation({
    mutationFn: (data) => base44.entities.Printer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast.success("Printer created");
      setShowAddForm(false);
      setFormData({
        name: "",
        type: "cashier",
        is_enabled: true,
        auto_print_on_order: false,
        receipt_width: 80,
        font_size: 12,
        print_kitchen_items: false,
        print_bar_items: false,
        restaurant_logo_url: "",
        receipt_header: brandName(),
        receipt_footer: "Thank you for your visit!",
        restaurant_address: "",
        restaurant_phone: "",
        restaurant_whatsapp: "",
        restaurant_hotline: "",
        restaurant_website: "",
        commercial_registration: "",
        tax_card: "",
        show_logo: true,
        show_address: true,
        show_phone: true,
        show_whatsapp: true,
        show_hotline: true,
        show_website: true,
        show_order_number: true,
        show_date_time: true,
        show_cashier: true,
        show_table_number: true,
        show_customer_name: true,
        show_payment_method: true,
        show_tax_breakdown: true,
        show_service_breakdown: true
      });
    }
  });

  const updatePrinterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Printer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast.success("Printer updated");
      setSelectedPrinter(null);
    }
  });

  const deletePrinterMutation = useMutation({
    mutationFn: (id) => base44.entities.Printer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast.success("Printer deleted");
      setDeleteDialogOpen(false);
      setPrinterToDelete(null);
    }
  });

  const updateRestaurantSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (restaurantSettings?.id) {
        return await base44.entities.SystemSettings.update(restaurantSettings.id, data);
      } else {
        return await base44.entities.SystemSettings.create({ ...data, setting_key: "printer_settings" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantSettings"] });
      toast.success("Settings saved");
    }
  });

  const handleSavePrinter = () => {
    if (!formData.name) {
      toast.error("Printer name is required");
      return;
    }

    if (selectedPrinter) {
      updatePrinterMutation.mutate({ id: selectedPrinter.id, data: formData });
    } else {
      createPrinterMutation.mutate(formData);
    }
  };

  const handleEditPrinter = (printer) => {
    setSelectedPrinter(printer);
    setFormData(printer);
    setShowAddForm(false);
  };

  const handleDeletePrinter = (printer) => {
    setPrinterToDelete(printer);
    setDeleteDialogOpen(true);
  };

  const handleBackToList = () => {
    setSelectedPrinter(null);
    setShowAddForm(false);
    setFormData({
      name: "",
      type: "cashier",
      is_enabled: true,
      auto_print_on_order: false,
      receipt_width: 80,
      font_size: 12,
      print_kitchen_items: false,
      print_bar_items: false,
      restaurant_logo_url: "",
      receipt_header: brandName(),
      receipt_footer: "Thank you for your visit!",
      restaurant_address: "",
      restaurant_phone: "",
      restaurant_whatsapp: "",
      restaurant_hotline: "",
      restaurant_website: "",
      show_logo: true,
      show_address: true,
      show_phone: true,
      show_whatsapp: true,
      show_hotline: true,
      show_website: true,
      show_order_number: true,
      show_date_time: true,
      show_cashier: true,
      show_table_number: true,
      show_customer_name: true,
      show_payment_method: true,
      show_tax_breakdown: true,
      show_service_breakdown: true
    });
  };

  // Show detail view if adding or editing
  if (showAddForm || selectedPrinter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBackToList}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Printers
          </Button>
          <h2 className="text-xl font-bold">
            {selectedPrinter ? "Edit Printer" : "Add New Printer"}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Printer Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Cashier Printer"
              />
            </div>

            <div>
              <Label>Printer IP/Identifier</Label>
              <Input
                value={formData.printer_ip || ""}
                onChange={(e) => setFormData({ ...formData, printer_ip: e.target.value })}
                placeholder="e.g., 192.168.1.110"
              />
              <p className="text-xs text-slate-500 mt-1">Optional: IP address or unique identifier for this printer</p>
            </div>

            <div>
              <Label>Printer Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier (Customer Receipt)</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Enable Printer</Label>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-print on Order</Label>
              <Switch
                checked={formData.auto_print_on_order}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_print_on_order: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receipt Width (mm)</Label>
                <Input
                  type="number"
                  value={formData.receipt_width}
                  onChange={(e) => setFormData({ ...formData, receipt_width: parseInt(e.target.value) || 80 })}
                />
              </div>
              <div>
                <Label>Font Size (px)</Label>
                <Input
                  type="number"
                  value={formData.font_size}
                  onChange={(e) => setFormData({ ...formData, font_size: parseInt(e.target.value) || 12 })}
                />
              </div>
            </div>

            <div>
              <Label>Font Family</Label>
              <Select value={formData.font_name || "Consolas"} onValueChange={(value) => setFormData({ ...formData, font_name: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consolas">Consolas</SelectItem>
                  <SelectItem value="Monaco">Monaco</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Lucida Console">Lucida Console</SelectItem>
                  <SelectItem value="Monospace">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type !== "cashier" && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label>Print Kitchen Items</Label>
                  <Switch
                    checked={formData.print_kitchen_items}
                    onCheckedChange={(checked) => setFormData({ ...formData, print_kitchen_items: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Print Bar Items</Label>
                  <Switch
                    checked={formData.print_bar_items}
                    onCheckedChange={(checked) => setFormData({ ...formData, print_bar_items: checked })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restaurant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Restaurant Logo</Label>
              <div className="mt-2 space-y-3">
                {formData.restaurant_logo_url && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                    <img src={formData.restaurant_logo_url} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
                {uploading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
              </div>
            </div>

            <div>
              <Label>Receipt Header</Label>
              <Input
                value={formData.receipt_header || ""}
                onChange={(e) => setFormData({ ...formData, receipt_header: e.target.value })}
                placeholder={brandName()}
              />
            </div>

            <div>
              <Label>Receipt Footer</Label>
              <Input
                value={formData.receipt_footer || ""}
                onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                placeholder="Thank you for your visit!"
              />
            </div>

            <div>
              <Label>Address</Label>
              <Input
                value={formData.restaurant_address || ""}
                onChange={(e) => setFormData({ ...formData, restaurant_address: e.target.value })}
                placeholder="123 Main St, City, Country"
              />
            </div>

            <div>
              <Label>Landline Phone</Label>
              <Input
                value={formData.restaurant_phone || ""}
                onChange={(e) => setFormData({ ...formData, restaurant_phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <Label>WhatsApp Number</Label>
              <Input
                value={formData.restaurant_whatsapp || ""}
                onChange={(e) => setFormData({ ...formData, restaurant_whatsapp: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <Label>Hotline Number</Label>
              <Input
                value={formData.restaurant_hotline || ""}
                onChange={(e) => setFormData({ ...formData, restaurant_hotline: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <Label>Website</Label>
              <Input
                value={formData.restaurant_website || ""}
                onChange={(e) => setFormData({ ...formData, restaurant_website: e.target.value })}
                placeholder="www.restaurant.com"
              />
            </div>

            <div>
              <Label>Commercial Registration</Label>
              <Input
                value={formData.commercial_registration || ""}
                onChange={(e) => setFormData({ ...formData, commercial_registration: e.target.value })}
                placeholder="Enter commercial registration number"
              />
            </div>

            <div>
              <Label>Tax Card</Label>
              <Input
                value={formData.tax_card || ""}
                onChange={(e) => setFormData({ ...formData, tax_card: e.target.value })}
                placeholder="Enter tax card number"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_logo}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_logo: checked })}
                />
                <Label>Logo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_address}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_address: checked })}
                />
                <Label>Address</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_phone}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_phone: checked })}
                />
                <Label>Phone</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_whatsapp}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_whatsapp: checked })}
                />
                <Label>WhatsApp</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_hotline}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_hotline: checked })}
                />
                <Label>Hotline</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_website}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_website: checked })}
                />
                <Label>Website</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_order_number}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_order_number: checked })}
                />
                <Label>Order Number</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_date_time}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_date_time: checked })}
                />
                <Label>Date & Time</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_cashier}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_cashier: checked })}
                />
                <Label>Cashier Name</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_table_number}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_table_number: checked })}
                />
                <Label>Table Number</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_customer_name}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_customer_name: checked })}
                />
                <Label>Customer Name</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_payment_method}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_payment_method: checked })}
                />
                <Label>Payment Method</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_tax_breakdown}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_tax_breakdown: checked })}
                />
                <Label>Tax Breakdown</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_service_breakdown}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_service_breakdown: checked })}
                />
                <Label>Service Charge</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button 
            onClick={handleSavePrinter} 
            disabled={createPrinterMutation.isPending || updatePrinterMutation.isPending}
          >
            {selectedPrinter ? "Update Printer" : "Create Printer"}
          </Button>
          <Button variant="outline" onClick={handleBackToList}>
            Cancel
          </Button>
          {selectedPrinter && (
            <Button 
              variant="destructive" 
              onClick={() => handleDeletePrinter(selectedPrinter)}
              className="ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Printer
            </Button>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Printer Management</h2>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Printer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Defined Printers</CardTitle>
        </CardHeader>
        <CardContent>
          {printers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Printer className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No printers configured yet</p>
              <Button onClick={() => setShowAddForm(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Printer
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {printers.map((printer) => (
                <div 
                  key={printer.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => handleEditPrinter(printer)}
                >
                  <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium">{printer.name}</p>
                      <p className="text-sm text-slate-500 capitalize">{printer.type} Printer</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestPrint(printer);
                      }}
                      className="gap-1"
                    >
                      <TestTube className="w-3 h-3" />
                      Test Print
                    </Button>
                    {printer.is_enabled ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Enabled</span>
                    ) : (
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">Disabled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Printer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{printerToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePrinterMutation.mutate(printerToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}