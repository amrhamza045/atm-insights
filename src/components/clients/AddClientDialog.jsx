import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2, Upload, FileCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { findClientMatches } from "./findClientMatches";
import DuplicateClientWarning from "./DuplicateClientWarning";
import PhoneField from "@/components/shared/PhoneField";
import { validateCountryPhone } from "@/lib/phoneCountries";

export default function AddClientDialog({ open, onOpenChange, onSave, clients, editingClient }) {
  const [formData, setFormData] = useState({
    name: "",
    client_type: "individual",
    email: "",
    phone: "",
    referred_by: "",
    status: "pending",
    notes: "",
    national_id_url: "",
    cashback_consumed: 0,
    consumed_payout: 0,
    payout_earned: 0
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || "",
        client_type: editingClient.client_type || "individual",
        email: editingClient.email || "",
        phone: editingClient.phone || "",
        referred_by: editingClient.referred_by || "",
        status: editingClient.status || "pending",
        notes: editingClient.notes || "",
        national_id_url: editingClient.national_id_url || "",
        cashback_consumed: editingClient.cashback_consumed || 0,
        consumed_payout: editingClient.consumed_payout || 0,
        payout_earned: editingClient.payout_earned || 0
      });
    } else {
      setFormData({
        name: "",
        client_type: "individual",
        email: "",
        phone: "",
        referred_by: "",
        status: "pending",
        notes: "",
        national_id_url: "",
        cashback_consumed: 0,
        consumed_payout: 0,
        payout_earned: 0
      });
    }
  }, [editingClient, open]);

  // Existing records already carrying this phone/email — surfaced as a warning, never a block.
  const duplicateMatches = findClientMatches(clients || [], {
    phone: formData.phone,
    email: formData.email,
    excludeId: editingClient?.id
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, national_id_url: result.file_url });
      toast.success("ID document uploaded");
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const phoneError = validateCountryPhone(formData.phone);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setSaving(true);
    
    let referralCode = editingClient?.referral_code;
    if (!referralCode) {
      const nameInitials = formData.name
        .split(" ")
        .filter(w => w.length > 0)
        .map(w => w[0].toUpperCase())
        .join("")
        .substring(0, 3) || "CLI";
      const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
      referralCode = `PRO-${nameInitials}-${uniqueId}`;
      
      // Ensure uniqueness
      const existingCodes = new Set(clients.map(c => c.referral_code));
      while (existingCodes.has(referralCode)) {
        referralCode = `PRO-${nameInitials}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
    }
    
    await onSave({ ...formData, referral_code: referralCode });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-amber-600" />
            </div>
            {editingClient ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Client Type</Label>
            <Select
              value={formData.client_type}
              onValueChange={(value) => setFormData({ ...formData, client_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <PhoneField
              value={formData.phone}
              onChange={(phone) => setFormData({ ...formData, phone })}
            />
          </div>

          <DuplicateClientWarning matches={duplicateMatches} phone={formData.phone} email={formData.email} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Referred By</Label>
              <Select 
                value={formData.referred_by} 
                onValueChange={(value) => setFormData({ ...formData, referred_by: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select referrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No referrer</SelectItem>
                  {clients
                    .filter(c => c.id !== editingClient?.id)
                    .map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>National ID / Passport</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('id-upload').click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : formData.national_id_url ? (
                  <FileCheck className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {formData.national_id_url ? "ID Uploaded" : "Upload ID"}
              </Button>
              <input
                id="id-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {formData.national_id_url && (
              <img 
                src={formData.national_id_url} 
                alt="National ID"
                className="w-full h-32 object-cover rounded border"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this client..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {editingClient && (
            <>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 text-slate-700">Manual Adjustments</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="cashback_consumed" className="text-xs">Cashback Consumed</Label>
                    <Input
                      id="cashback_consumed"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.cashback_consumed}
                      onChange={(e) => setFormData({ ...formData, cashback_consumed: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumed_payout" className="text-xs">Payout Consumed</Label>
                    <Input
                      id="consumed_payout"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.consumed_payout}
                      onChange={(e) => setFormData({ ...formData, consumed_payout: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payout_earned" className="text-xs">Payout Earned</Label>
                    <Input
                      id="payout_earned"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.payout_earned}
                      onChange={(e) => setFormData({ ...formData, payout_earned: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!formData.name.trim() || saving || !!phoneError}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingClient ? "Save Changes" : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}