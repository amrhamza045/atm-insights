import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateInvitationToken } from "./invitationTokens";
import { sendInvitation } from "./invitationSend";

const EMPTY = { guest_name: "", email: "", phone: "", party_size: 1, table_assignment: "", notes: "" };

export default function InvitationFormDialog({ open, onOpenChange, event, invitation }) {
  const [form, setForm] = useState(invitation || EMPTY);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open) setForm(invitation || EMPTY);
  }, [open, invitation]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.guest_name?.trim()) return toast.error("Guest name is required");
    setSaving(true);
    try {
      const payload = {
        guest_name: form.guest_name.trim(),
        email: form.email || "",
        phone: form.phone || "",
        party_size: Number(form.party_size) || 1,
        table_assignment: form.table_assignment || "",
        notes: form.notes || "",
      };
      if (invitation?.id) {
        await base44.entities.CateringInvitation.update(invitation.id, payload);
        toast.success("Guest updated");
      } else {
        const created = await base44.entities.CateringInvitation.create({
          ...payload,
          branch_id: event.branch_id,
          branch_name: event.branch_name || "",
          event_id: event.id,
          event_name: event.event_name,
          token: generateInvitationToken(),
          rsvp_status: "invited",
        });
        if (created.email) {
          try {
            await sendInvitation(created, event, "email", "en");
            toast.success(`Invitation emailed to ${created.guest_name}`);
          } catch (error) {
            toast.error(`Guest saved, but the email could not be sent: ${error.message || "delivery failed"}`);
          }
        } else {
          toast.success("Guest added — no email address was provided");
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["catering-invitations", event.id] });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{invitation?.id ? "Edit guest" : "Invite a guest"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Guest name *</Label>
            <Input value={form.guest_name} onChange={(e) => set("guest_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Seats offered</Label>
              <Input type="number" min="1" value={form.party_size} onChange={(e) => set("party_size", e.target.value)} />
            </div>
            <div>
              <Label>Table / group</Label>
              <Input value={form.table_assignment} onChange={(e) => set("table_assignment", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Internal notes</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Sending…" : invitation?.id ? "Save" : form.email ? "Save & send email" : "Add guest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}