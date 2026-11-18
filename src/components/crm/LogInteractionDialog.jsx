import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { INTERACTION_TYPES } from "./interactionMeta";

export default function LogInteractionDialog({ open, onOpenChange, client, currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ interaction_type: "call", note: "", follow_up_date: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.note.trim()) {
      toast.error("Please add a note describing the interaction");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ClientInteraction.create({
        client_id: client.id,
        client_name: client.name,
        interaction_type: form.interaction_type,
        note: form.note.trim(),
        occurred_at: new Date().toISOString(),
        follow_up_date: form.follow_up_date || undefined,
        created_by_email: currentUser?.email,
        created_by_name: currentUser?.full_name,
      });
      await queryClient.invalidateQueries({ queryKey: ["crm-interactions", client.id] });
      setForm({ interaction_type: "call", note: "", follow_up_date: "" });
      onOpenChange(false);
      toast.success("Interaction logged");
    } catch (e) {
      toast.error("Could not log interaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Log interaction — {client.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={form.interaction_type} onValueChange={(v) => setForm({ ...form, interaction_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note *</Label>
            <Textarea
              rows={4}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="What was discussed?"
            />
          </div>
          <div>
            <Label>Follow-up date (optional)</Label>
            <Input
              type="date"
              value={form.follow_up_date}
              onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}