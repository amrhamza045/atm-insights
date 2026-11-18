import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bike, Plus, Pencil, Trash2, Phone, Mail, Star, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryPersonManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [companyDialog, setCompanyDialog] = useState(false);
  const [companyData, setCompanyData] = useState({ name: "", contact_phone: "", commission_percentage: 0 });
  const queryClient = useQueryClient();

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ["deliveryPersons"],
    queryFn: () => base44.asServiceRole.entities.DeliveryPerson.list("-created_date")
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["deliveryZones"],
    queryFn: () => base44.asServiceRole.entities.DeliveryZone.list()
  });

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.asServiceRole.entities.DeliveryCompany.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryPerson.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryPersons"] });
      toast.success("Delivery person added");
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeliveryPerson.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryPersons"] });
      toast.success("Delivery person updated");
      setShowForm(false);
      setEditingPerson(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryPerson.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryPersons"] });
      toast.success("Delivery person deleted");
    }
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryCompany.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryCompanies"] });
      toast.success("Delivery company added");
      setCompanyDialog(false);
      setCompanyData({ name: "", contact_phone: "", commission_percentage: 0 });
    }
  });

  const handleAddCompany = () => {
    if (!companyData.name) {
      toast.error("Please enter company name");
      return;
    }
    createCompanyMutation.mutate(companyData);
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-slate-100 text-slate-800",
    busy: "bg-amber-100 text-amber-800",
    offline: "bg-red-100 text-red-800"
  };

  const vehicleIcons = {
    motorcycle: "🏍️",
    car: "🚗",
    bicycle: "🚲",
    scooter: "🛵"
  };

  return (
    <div className="space-y-6">
      {/* Delivery Companies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Delivery Companies
            </CardTitle>
            <Button onClick={() => setCompanyDialog(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            {deliveryCompanies.length === 0 ? (
              <div className="col-span-full text-center py-6 text-slate-500">
                <p>No delivery companies yet</p>
              </div>
            ) : (
              deliveryCompanies.map(company => (
                <div key={company.id} className="border rounded-lg p-3">
                  <p className="font-semibold">{company.name}</p>
                  {company.contact_phone && <p className="text-sm text-slate-600">{company.contact_phone}</p>}
                  {company.commission_percentage > 0 && (
                    <p className="text-xs text-slate-500">Commission: {company.commission_percentage}%</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Persons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bike className="w-5 h-5" />
              Delivery Persons
            </CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Delivery Person
            </Button>
          </div>
        </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {deliveryPersons.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Bike className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No delivery persons yet</p>
            </div>
          ) : (
            deliveryPersons.map((person) => (
              <Card key={person.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                        {vehicleIcons[person.vehicle_type] || "🚗"}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{person.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge className={statusColors[person.status]}>
                            {person.status}
                          </Badge>
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {person.phone}
                          </span>
                          {person.email && (
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {person.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <span>Vehicle: {person.vehicle_type} {person.vehicle_number && `(${person.vehicle_number})`}</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            {person.rating?.toFixed(1) || "5.0"}
                          </span>
                          <span>{person.total_deliveries || 0} deliveries</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingPerson(person);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteMutation.mutate(person.id)}
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
        if (!open) setEditingPerson(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPerson ? "Edit" : "Add"} Delivery Person</DialogTitle>
          </DialogHeader>
          <DeliveryPersonForm
            person={editingPerson}
            zones={zones}
            onSave={(data) => {
              if (editingPerson) {
                updateMutation.mutate({ id: editingPerson.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingPerson(null);
            }}
          />
        </DialogContent>
        </Dialog>

        {/* Delivery Company Dialog */}
        <Dialog open={companyDialog} onOpenChange={setCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Delivery Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={companyData.name}
                onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                placeholder="Talabat, Noon, etc."
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={companyData.contact_phone}
                onChange={(e) => setCompanyData({...companyData, contact_phone: e.target.value})}
              />
            </div>
            <div>
              <Label>Commission %</Label>
              <Input
                type="number"
                value={companyData.commission_percentage}
                onChange={(e) => setCompanyData({...companyData, commission_percentage: parseFloat(e.target.value)})}
              />
            </div>
            <Button onClick={handleAddCompany} disabled={createCompanyMutation.isPending} className="w-full">
              Add Company
            </Button>
          </div>
        </DialogContent>
        </Dialog>
        </Card>
        </div>
        );
        }

function DeliveryPersonForm({ person, zones, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: person?.name || "",
    phone: person?.phone || "",
    email: person?.email || "",
    vehicle_type: person?.vehicle_type || "motorcycle",
    vehicle_number: person?.vehicle_number || "",
    status: person?.status || "active",
    assigned_zones: person?.assigned_zones || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleZone = (zoneId) => {
    setFormData(prev => ({
      ...prev,
      assigned_zones: prev.assigned_zones.includes(zoneId)
        ? prev.assigned_zones.filter(id => id !== zoneId)
        : [...prev.assigned_zones, zoneId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name*</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Phone*</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div>
          <Label>Vehicle Type</Label>
          <Select value={formData.vehicle_type} onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="bicycle">Bicycle</SelectItem>
              <SelectItem value="scooter">Scooter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Vehicle Number</Label>
          <Input
            value={formData.vehicle_number}
            onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Assigned Zones</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {zones.map((zone) => (
            <Badge
              key={zone.id}
              onClick={() => toggleZone(zone.id)}
              className={`cursor-pointer ${
                formData.assigned_zones.includes(zone.id)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {zone.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {person ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}