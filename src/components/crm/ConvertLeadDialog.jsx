import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, UserPlus, Link2 } from "lucide-react";
import { toast } from "sonner";
import { findMatchingClient, convertLead, leadName } from "./leadPipeline";

export default function ConvertLeadDialog({ lead, open, onOpenChange, currentUser }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["crm-all-clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 2000),
    enabled: open,
  });

  const match = open && !isLoading ? findMatchingClient(lead, clients) : null;

  const handleConvert = async () => {
    setSaving(true);
    try {
      const { client, mode } = await convertLead({ lead, existingClient: match, currentUser });
      await queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      await queryClient.invalidateQueries({ queryKey: ["crm-all-clients"] });
      onOpenChange(false);
      toast.success(
        mode === "linked_existing"
          ? `Linked to existing client ${client.name} — no duplicate created`
          : `New client ${client.name} created`
      );
    } catch (e) {
      toast.error("Conversion failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Convert lead — {leadName(lead)}</DialogTitle></DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-500">Checking for existing clients…</p>
        ) : match ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Existing client found
            </p>
            <p className="text-sm text-amber-900">{match.name}</p>
            <p className="text-xs text-amber-800">{match.email || "—"} · {match.phone || "—"}</p>
            <p className="text-xs text-amber-800 pt-1">
              This lead matches an existing client by email or phone. Converting will link the lead to
              that client instead of creating a duplicate.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="text-sm font-semibold text-slate-900">No matching client</p>
            <p className="text-xs text-slate-600">
              A new client will be created from this lead's name, email and phone.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConvert} disabled={saving || isLoading} className="gap-1.5">
            {match ? <Link2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {match ? "Link to existing client" : "Create client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}