import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryZoneManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery({
    queryKey: ["deliveryZones"],
    queryFn: async () => {
      try {
        // Fetch all delivery zones across all branches
        const allZones = await base44.asServiceRole.entities.DeliveryZone.list("-created_date");
        return allZones || [];
      } catch (error) {
        console.error("Error fetching delivery zones:", error);
        return [];
      }
    }
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryZone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryZones"] });
      toast.success("Delivery zone added");
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeliveryZone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryZones"] });
      toast.success("Delivery zone updated");
      setShowForm(false);
      setEditingZone(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryZone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryZones"] });
      toast.success("Delivery zone deleted");
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Zones
          </CardTitle>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {zones.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No delivery zones yet</p>
            </div>
          ) : (
            zones.map((zone) => (
              <Card key={zone.id} className="border-0 shadow-sm" style={{ borderLeft: `4px solid ${zone.color || "#3b82f6"}` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{zone.name}</h3>
                        <Badge className={zone.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {zone.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {zone.description && (
                        <p className="text-sm text-slate-600 mb-2">{zone.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                       <span className="font-medium">Default: {zone.delivery_fee} EGP</span>
                       {zone.estimated_time && (
                         <span className="flex items-center gap-1">
                           <Clock className="w-4 h-4" />
                           {zone.estimated_time} mins
                         </span>
                       )}
                      </div>
                      {zone.company_specific_fees && Object.keys(zone.company_specific_fees).length > 0 && (
                       <div className="mt-2">
                         <p className="text-xs text-slate-500 mb-1">Company-specific fees:</p>
                         <div className="flex flex-wrap gap-2">
                           {Object.entries(zone.company_specific_fees).map(([companyId, fee]) => {
                             const company = companies.find(c => c.id === companyId);
                             return company ? (
                               <Badge key={companyId} variant="outline" className="text-xs">
                                 {company.name}: {fee} EGP
                               </Badge>
                             ) : null;
                           })}
                         </div>
                       </div>
                      )}
                      {zone.areas && zone.areas.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Areas:</p>
                          <div className="flex flex-wrap gap-1">
                            {zone.areas.map((area, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingZone(zone);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteMutation.mutate(zone.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingZone(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit" : "Add"} Delivery Zone</DialogTitle>
          </DialogHeader>
          <DeliveryZoneForm
            zone={editingZone}
            companies={companies}
            onSave={(data) => {
              if (editingZone) {
                updateMutation.mutate({ id: editingZone.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingZone(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DeliveryZoneForm({ zone, companies, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: zone?.name || "",
    description: zone?.description || "",
    delivery_fee: zone?.delivery_fee || 0,
    company_specific_fees: zone?.company_specific_fees || {},
    estimated_time: zone?.estimated_time || 30,
    is_active: zone?.is_active !== undefined ? zone.is_active : true,
    color: zone?.color || "#3b82f6",
    areas: zone?.areas || []
  });

  const [areaInput, setAreaInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auto-set fees to 0 for third-party delivery companies
    const updatedFees = { ...formData.company_specific_fees };
    companies.forEach(company => {
      if (['Talabat', 'Hurry Up', 'Rabbit'].includes(company.name)) {
        updatedFees[company.id] = 0;
      }
    });
    
    onSave({ ...formData, company_specific_fees: updatedFees });
  };

  const addArea = () => {
    if (areaInput.trim()) {
      setFormData(prev => ({
        ...prev,
        areas: [...prev.areas, areaInput.trim()]
      }));
      setAreaInput("");
    }
  };

  const removeArea = (index) => {
    setFormData(prev => ({
      ...prev,
      areas: prev.areas.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Zone Name*</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Downtown, North District"
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Landmarks or details"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Delivery Fee (EGP)*</Label>
          <Input
            type="number"
            value={formData.delivery_fee}
            onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label>Estimated Time (mins)</Label>
          <Input
            type="number"
            value={formData.estimated_time}
            onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Color</Label>
          <Input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Active</span>
          </label>
        </div>
      </div>

      <div>
        <Label>Company-Specific Delivery Fees</Label>
        <p className="text-xs text-slate-500 mb-3">Set different fees per delivery company (optional)</p>
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
          {companies.map(company => {
            const isThirdParty = ['Talabat', 'Hurry Up', 'Rabbit'].includes(company.name);
            const defaultValue = isThirdParty ? 0 : formData.company_specific_fees[company.id] || "";
            
            return (
              <div key={company.id} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium flex-1">{company.name}</span>
                <Input
                  type="number"
                  step="0.01"
                  value={isThirdParty ? 0 : (formData.company_specific_fees[company.id] || "")}
                  onChange={(e) => {
                    if (isThirdParty) return; // Don't allow changes for third-party companies
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      company_specific_fees: value === "" 
                        ? Object.fromEntries(Object.entries(prev.company_specific_fees).filter(([k]) => k !== company.id))
                        : { ...prev.company_specific_fees, [company.id]: parseFloat(value) }
                    }));
                  }}
                  placeholder={isThirdParty ? "0" : `Default: ${formData.delivery_fee}`}
                  className="w-28"
                  disabled={isThirdParty}
                />
                <span className="text-xs text-slate-500">EGP</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Areas/Streets</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            placeholder="Add area name"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArea())}
          />
          <Button type="button" onClick={addArea}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.areas.map((area, idx) => (
            <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => removeArea(idx)}>
              {area} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {zone ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}