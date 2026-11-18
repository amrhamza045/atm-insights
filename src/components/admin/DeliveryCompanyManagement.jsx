import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryCompanyManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    delivery_type: "indirect",
    contact_phone: "",
    contact_email: "",
    commission_percentage: 0,
    additional_fee_type: "none",
    additional_fee_value: 0,
    is_subject_to_tax: true,
    allow_manual_discount: false,
    is_active: true,
    color: "#10b981"
  });

  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.asServiceRole.entities.DeliveryCompany.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryCompany.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryCompanies"] });
      toast.success("Delivery company created");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeliveryCompany.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryCompanies"] });
      toast.success("Delivery company updated");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryCompany.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryCompanies"] });
      toast.success("Delivery company deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      delivery_type: "indirect",
      contact_phone: "",
      contact_email: "",
      commission_percentage: 0,
      additional_fee_type: "none",
      additional_fee_value: 0,
      is_subject_to_tax: true,
      allow_manual_discount: false,
      is_active: true,
      color: "#10b981"
    });
    setEditingCompany(null);
    setDialogOpen(false);
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || "",
      delivery_type: company.delivery_type || "indirect",
      contact_phone: company.contact_phone || "",
      contact_email: company.contact_email || "",
      commission_percentage: company.commission_percentage || 0,
      additional_fee_type: company.additional_fee_type || "none",
      additional_fee_value: company.additional_fee_value || 0,
      is_subject_to_tax: company.is_subject_to_tax !== false,
      allow_manual_discount: company.allow_manual_discount || false,
      is_active: company.is_active !== false,
      color: company.color || "#10b981"
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Delivery Companies</h2>
          <p className="text-sm text-slate-500">Manage third-party delivery services</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      <div className="grid gap-4">
        {companies.map(company => (
          <Card key={company.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: company.color || "#10b981" }}
                  >
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    {company.contact_phone && (
                      <p className="text-sm text-slate-600">{company.contact_phone}</p>
                    )}
                    {company.contact_email && (
                      <p className="text-sm text-slate-600">{company.contact_email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={company.delivery_type === "direct" ? "default" : "secondary"}>
                        {company.delivery_type === "direct" ? "Direct (Restaurant Delivers)" : "Indirect (Platform Delivers)"}
                      </Badge>
                      <Badge variant="outline">
                        {company.commission_percentage}% Commission
                      </Badge>
                      <Badge variant={company.is_subject_to_tax ? "default" : "secondary"}>
                        {company.is_subject_to_tax ? "Tax Applied" : "Tax Exempt"}
                      </Badge>
                      {company.additional_fee_type && company.additional_fee_type !== "none" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          {company.additional_fee_type === "fixed" 
                            ? `+${company.additional_fee_value} EGP Fee` 
                            : `+${company.additional_fee_value}% Fee`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(company)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete ${company.name}?`)) {
                        deleteMutation.mutate(company.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {companies.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No delivery companies yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Edit Delivery Company" : "Add Delivery Company"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Talabat, Noon Food"
                required
              />
            </div>

            <div>
              <Label>Delivery Type</Label>
              <select
                value={formData.delivery_type}
                onChange={(e) => setFormData({ ...formData, delivery_type: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm bg-white"
              >
                <option value="indirect">Indirect — Third-party platform delivers (e.g., Talabat, Noon Food)</option>
                <option value="direct">Direct — Restaurant delivers using own drivers</option>
              </select>
            </div>

            <div>
              <Label>Contact Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>

            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label>Commission Percentage</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.commission_percentage}
                onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
              <Label className="text-base font-semibold">Additional Fee Settings</Label>
              
              <div>
                <Label>Fee Type</Label>
                <select
                  value={formData.additional_fee_type}
                  onChange={(e) => setFormData({ ...formData, additional_fee_type: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                >
                  <option value="none">No Additional Fee</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage of Order</option>
                </select>
              </div>

              {formData.additional_fee_type !== "none" && (
                <div>
                  <Label>
                    Fee Value {formData.additional_fee_type === "fixed" ? "(EGP)" : "(%)"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.additional_fee_value}
                    onChange={(e) => setFormData({ ...formData, additional_fee_value: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.additional_fee_type === "fixed" 
                      ? "Fixed amount added to each order" 
                      : "Percentage of order subtotal added as fee"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Subject to Tax</Label>
                <p className="text-xs text-slate-500">Apply tax to this company's orders</p>
              </div>
              <Switch
                checked={formData.is_subject_to_tax}
                onCheckedChange={(checked) => setFormData({ ...formData, is_subject_to_tax: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Allow Manual Discount</Label>
                <p className="text-xs text-slate-500">Enable manual discount in POS for this company</p>
              </div>
              <Switch
                checked={formData.allow_manual_discount}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_manual_discount: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingCompany ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}