import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Edit, Trash2, Home, Briefcase, Building, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function AddressManagement({ clientId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    address_name: "",
    street_address: "",
    city: "",
    area: "",
    building: "",
    floor: "",
    apartment: "",
    phone: "",
    location_url: "",
    notes: "",
    is_default: false
  });

  const queryClient = useQueryClient();

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", clientId],
    queryFn: () => base44.entities.Address.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Address.create({ ...data, client_id: clientId }),
    onSuccess: async (newAddress) => {
      if (newAddress.is_default) {
        await Promise.all(
          addresses
            .filter(addr => addr.id !== newAddress.id && addr.is_default)
            .map(addr => base44.entities.Address.update(addr.id, { is_default: false }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["addresses", clientId] });
      toast.success("Address added successfully");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Address.update(id, data),
    onSuccess: async (updatedAddress) => {
      if (updatedAddress.is_default) {
        await Promise.all(
          addresses
            .filter(addr => addr.id !== updatedAddress.id && addr.is_default)
            .map(addr => base44.entities.Address.update(addr.id, { is_default: false }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["addresses", clientId] });
      toast.success("Address updated successfully");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Address.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", clientId] });
      toast.success("Address deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      address_name: "",
      street_address: "",
      city: "",
      area: "",
      building: "",
      floor: "",
      apartment: "",
      phone: "",
      location_url: "",
      notes: "",
      is_default: false
    });
    setEditingAddress(null);
    setDialogOpen(false);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData(address);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getAddressIcon = (name) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("home")) return Home;
    if (nameLower.includes("work") || nameLower.includes("office")) return Briefcase;
    return Building;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Delivery Addresses</h3>
          <p className="text-sm text-slate-600">Manage your delivery locations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900">No addresses yet</h3>
            <p className="text-sm text-slate-500 mt-1">Add your first delivery address</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => {
            const Icon = getAddressIcon(address.address_name);
            return (
              <Card key={address.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-amber-600" />
                      <CardTitle className="text-base">{address.address_name}</CardTitle>
                      {address.is_default && (
                        <Badge className="bg-green-100 text-green-700">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(address)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(address.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-900">{address.street_address}</p>
                    {address.building && <p className="text-slate-600">Building: {address.building}</p>}
                    {address.floor && <p className="text-slate-600">Floor: {address.floor}</p>}
                    {address.apartment && <p className="text-slate-600">Apt: {address.apartment}</p>}
                    {address.area && <p className="text-slate-600">Area: {address.area}</p>}
                    {address.city && <p className="text-slate-600">City: {address.city}</p>}
                    {address.phone && <p className="text-slate-600">Phone: {address.phone}</p>}
                    {address.notes && (
                      <p className="text-slate-500 italic mt-2">{address.notes}</p>
                    )}
                    {address.location_url && (
                      <a
                        href={address.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:underline flex items-center gap-1 mt-2 font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        Open Location
                      </a>
                    )}
                    {address.qr_code_image_url && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1.5 text-slate-600 mb-1.5">
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Location QR Code</span>
                        </div>
                        <img
                          src={address.qr_code_image_url}
                          alt="Location QR Code"
                          className="w-32 h-32 object-contain bg-white border border-slate-200 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(address.qr_code_image_url, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Address Name*</Label>
                <Input
                  value={formData.address_name}
                  onChange={(e) => setFormData({ ...formData, address_name: e.target.value })}
                  placeholder="Home, Work, Office, etc."
                  required
                />
              </div>
              <div className="col-span-2">
                <Label>Street Address*</Label>
                <Textarea
                  value={formData.street_address}
                  onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                  placeholder="Full street address"
                  required
                />
              </div>
              <div>
                <Label>Area</Label>
                <Input
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="District or area"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label>Building</Label>
                <Input
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="Building name/number"
                />
              </div>
              <div>
                <Label>Floor</Label>
                <Input
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="Floor number"
                />
              </div>
              <div>
                <Label>Apartment</Label>
                <Input
                  value={formData.apartment}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                  placeholder="Apartment/Unit"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact phone"
                />
              </div>
              <div className="col-span-2">
                <Label>Location (Google Maps)</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.location_url}
                    onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                    placeholder="Paste Google Maps link here"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open('https://www.google.com/maps', '_blank')}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Select
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Select" to open Google Maps, find your location, then copy and paste the URL here
                </p>
              </div>
              <div className="col-span-2">
                <Label>Delivery Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions for delivery"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_default" className="cursor-pointer">Set as default address</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAddress ? "Update" : "Add"} Address
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}