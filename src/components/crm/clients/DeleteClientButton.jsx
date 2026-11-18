import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { refreshClientLists } from "./clientForm";

// A client with catering events is never deleted: their events and payments would lose their client.
export default function DeleteClientButton({ client, onDeleted }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!window.confirm(`Delete ${client.name}? This can't be undone.`)) return;
    setBusy(true);
    try {
      const events = await base44.entities.CateringEvent.filter({ client_id: client.id }, "-event_date", 1);
      if (events.length > 0) {
        toast.error("This client has catering events, so it can't be deleted. Set it to inactive instead, or merge it from Possible duplicates.");
        return;
      }
      await base44.entities.Client.delete(client.id);
      refreshClientLists(queryClient);
      toast.success("Client deleted");
      onDeleted();
    } catch (e) {
      toast.error(e?.message || "Could not delete the client");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 hover:text-red-700" onClick={remove} disabled={busy}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
    </Button>
  );
}