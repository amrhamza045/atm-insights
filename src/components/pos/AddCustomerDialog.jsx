import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Loader2, AlertTriangle } from "lucide-react";

export default function AddCustomerDialog({ open, onClose, onCustomerAdded, searchQuery = "", existingClients }) {
  // If existingClients not passed as prop, fetch them internally
  const { data: fetchedClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
    enabled: !existingClients
  });
  const clients = existingClients || fetchedClients;
  const [formData, setFormData] = useState({
    name: searchQuery || "",
    phone: "",
    address: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  // Normalize phone for comparison (strip spaces, dashes)
  const normalizePhone = (phone) => phone?.replace(/[\s\-\(\)]/g, "").trim() || "";

  // Find duplicate by phone among all clients
  const duplicateClient = formData.phone.trim().length >= 6
    ? clients.find(c => normalizePhone(c.phone) === normalizePhone(formData.phone))
    : null;

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("Mobile number is required");
      return;
    }

    if (duplicateClient) {
      toast.error(`Mobile number already used by "${duplicateClient.name}". Please select the existing customer instead.`);
      return;
    }

    setSaving(true);
    try {
      await onCustomerAdded(formData);
      setFormData({ name: "", phone: "", address: "", notes: "" });
    } catch (error) {
      toast.error("Failed to add customer");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", phone: "", address: "", notes: "" });
    onClose();
  };

  // Sync name from searchQuery when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, name: searchQuery || "" }));
    }
  }, [open, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600" />
            Add New Customer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter mobile number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={duplicateClient ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {duplicateClient && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-semibold">Duplicate mobile number!</p>
                  <p className="text-xs mt-0.5">
                    This number is already used by <strong>{duplicateClient.name}</strong>
                    {duplicateClient.loyalty_program_enrolled
                      ? " (Loyalty Member)"
                      : " (POS Customer)"}
                    . Please close this dialog and select the existing customer instead.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Enter address (optional)"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Special Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special notes or preferences (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name.trim() || !formData.phone.trim() || !!duplicateClient}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Customer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}