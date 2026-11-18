import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquareHeart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function StarRow({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} className="p-1">
            <Star className={`w-7 h-7 ${n <= value ? "text-amber-500 fill-amber-500" : "text-slate-300"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CaptainFeedbackDialog({
  open, onClose, selectedTable, selectedCustomer, currentUser, branchId, branchName
}) {
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setFoodRating(0); setServiceRating(0); setGuestName(""); setComment(""); };

  const handleSave = async () => {
    if (!foodRating || !serviceRating) { toast.error("Please rate both food and service"); return; }
    setSaving(true);
    try {
      const worst = Math.min(foodRating, serviceRating);
      await base44.entities.TableFeedback.create({
        branch_id: branchId || null,
        branch_name: branchName || null,
        table_number: selectedTable ? String(selectedTable.table_number) : "",
        captain_email: currentUser?.email || "",
        captain_name: currentUser?.full_name || currentUser?.email || "",
        client_id: selectedCustomer?.id || null,
        client_name: selectedCustomer?.name || guestName.trim(),
        client_phone: selectedCustomer?.phone || "",
        food_rating: foodRating,
        service_rating: serviceRating,
        comment: comment.trim(),
        would_recommend: worst >= 4,
        follow_up_needed: worst <= 2
      });
      toast.success("Guest feedback saved");
      reset();
      onClose();
    } catch {
      toast.error("Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-rose-500" />
            Guest Feedback {selectedTable ? `— Table ${selectedTable.table_number}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedCustomer && (
            <div className="space-y-1">
              <Label className="text-sm">Guest name (optional)</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" />
            </div>
          )}
          {selectedCustomer && (
            <p className="text-sm text-slate-600">Guest: <span className="font-medium">{selectedCustomer.name}</span></p>
          )}

          <StarRow label="Food quality" value={foodRating} onChange={setFoodRating} />
          <StarRow label="Service" value={serviceRating} onChange={setServiceRating} />

          <div className="space-y-1">
            <Label className="text-sm">Comments</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="What did the guest say?" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}