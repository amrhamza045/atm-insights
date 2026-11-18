import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ClientFormFields from "./ClientFormFields";
import { clientToForm, formToClient, validateClientForm, refreshClientLists } from "./clientForm";

export default function EditClientButton({ client, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const error = validateClientForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const changes = formToClient(form);
      const updated = await base44.entities.Client.update(client.id, changes);
      refreshClientLists(queryClient);
      toast.success("Client updated");
      setForm(null);
      onSaved({ ...client, ...changes, ...(updated || {}) });
    } catch (e) {
      toast.error(e?.message || "Could not save the client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setForm(clientToForm(client))}>
        <Pencil className="w-3.5 h-3.5" /> Edit
      </Button>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit client</DialogTitle></DialogHeader>
          {form && <ClientFormFields form={form} setForm={setForm} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}