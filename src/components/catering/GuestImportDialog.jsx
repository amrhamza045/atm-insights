import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateInvitationToken } from "./invitationTokens";
import { parseGuestSheet } from "./guestSheetParser";

export default function GuestImportDialog({ open, onOpenChange, event }) {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setRows([]);
    setError("");
    try {
      const list = await parseGuestSheet(file);
      if (list.length === 0) throw new Error("No guests with a name were found. Make sure the first row has column headers like name, phone, email.");
      setRows(list);
      toast.success(`Found ${list.length} guest(s)`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setParsing(false);
    }
  };

  const importGuests = async () => {
    setSaving(true);
    try {
      await base44.entities.CateringInvitation.bulkCreate(
        rows.map((g) => ({
          branch_id: event.branch_id,
          branch_name: event.branch_name || "",
          event_id: event.id,
          event_name: event.event_name,
          guest_name: String(g.name).trim(),
          email: g.email ? String(g.email).trim() : "",
          phone: g.phone ? String(g.phone).trim() : "",
          party_size: Number(g.seats) > 0 ? Number(g.seats) : 1,
          token: generateInvitationToken(),
          rsvp_status: "invited",
        }))
      );
      await queryClient.invalidateQueries({ queryKey: ["catering-invitations", event.id] });
      toast.success(`${rows.length} guest(s) invited`);
      setRows([]);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import guests from a sheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Upload an Excel or CSV file with columns for name, phone and email. Each row becomes a guest with their own RSVP link.
          </p>
          <div>
            <Label>Guest file</Label>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={parsing} />
          </div>

          {parsing && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Reading the file…
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</p>
          )}

          {rows.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {rows.map((g, i) => (
                <div key={i} className="p-2 text-sm flex justify-between gap-3">
                  <span className="font-medium truncate">{g.name}</span>
                  <span className="text-xs text-slate-500 truncate">{g.email || g.phone || "no contact"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={importGuests} disabled={rows.length === 0 || saving} className="gap-1.5">
            <Upload className="w-4 h-4" />
            {saving ? "Importing…" : `Import ${rows.length || ""} guest(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}